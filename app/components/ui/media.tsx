'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  File,
  MapPin,
  CheckCircle,
  ExternalLink,
  X,
  Loader2,
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import Lottie from 'lottie-react'
import { inflate } from 'pako'
import { decodeStrippedThumb, toJPGDataURL, cn } from '@/lib/utils'
import {
  AudioDocumentAttributeData,
  DocumentMediaData,
  MediaData,
  GeoLiveMediaData,
  VenueMediaData,
  PollMediaData,
  WebPageMediaData,
  DefaultWebPageData,
  DocumentData,
} from '@/api'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()
interface MediaProps {
  mediaUrl?: string
  metadata: MediaData
  time?: string
}

const getThumbURL = (document: DocumentData) => {
  try {
    // @ts-expect-error already handling undefined 'thumbBytes'
    const thumbBytes = document.thumbs?.[0]?.bytes
    return thumbBytes
      ? toJPGDataURL(decodeStrippedThumb(thumbBytes as Uint8Array))
      : undefined
  } catch (err) {
    console.error('Failed to decode thumbnail', err)
    return undefined
  }
}

const getDocumentType = (media: DocumentMediaData) => {
  if (media.video) return 'video'
  if (media.voice) return 'audio'

  if (media.document) {
    const mime = media.document?.mimeType?.toLowerCase() || ''
    const fileName =
      media.document?.attributes
        ?.find((a) => 'fileName' in a)
        ?.fileName?.toLowerCase() || ''

    if (mime.startsWith('video/')) return 'gif'
    if (mime.startsWith('image/')) return 'image'
    if (mime === 'application/pdf') return 'pdf'
    if (mime === 'application/zip' || /\.zip$|\.rar$|\.7z$/.test(fileName))
      return 'archive'
    if (mime === 'application/x-tgsticker') return 'x-tgsticker'
  }

  return 'other'
}

export const Media: React.FC<MediaProps> = ({ mediaUrl, metadata, time }) => {
  let mediaContent

  switch (metadata.type) {
    case 'photo': {
      mediaContent = <ImageMedia mediaUrl={mediaUrl} />
      break
    }
    case 'geo-live':
    case 'venue': {
      mediaContent = <GeoMedia metadata={metadata} />
      break
    }
    case 'poll': {
      mediaContent = <PoolMedia metadata={metadata} />
      break
    }
    case 'webpage': {
      mediaContent = <WebPageMedia metadata={metadata} />
      break
    }
    case 'document': {
      const docType = getDocumentType(metadata)

      switch (docType) {
        case 'gif': {
          mediaContent = <GifMedia mediaUrl={mediaUrl} metadata={metadata} />
          break
        }
        case 'image': {
          mediaContent = <ImageMedia mediaUrl={mediaUrl} />
          break
        }
        case 'video': {
          mediaContent = <VideoMedia mediaUrl={mediaUrl} metadata={metadata} />
          break
        }
        case 'audio': {
          mediaContent = (
            <Bubble>
              <AudioMedia metadata={metadata} mediaUrl={mediaUrl} />
            </Bubble>
          )
          break
        }
        case 'x-tgsticker': {
          mediaContent = (
            <TgStickerMedia metadata={metadata} mediaUrl={mediaUrl} />
          )
          break
        }
        default: {
          mediaContent = (
            <Bubble>
              <FileMedia metadata={metadata} mediaUrl={mediaUrl} />
            </Bubble>
          )
          break
        }
      }
      break
    }
    case 'unsupported': {
      // skipping unsupported media types visualization
      break
    }
    default: {
      console.log(JSON.stringify(metadata))
      mediaContent = (
        <Bubble>
          <UnknownMedia />
        </Bubble>
      )
      break
    }
  }

  return (
    <div className="flex flex-col items-center">
      {mediaContent}
      {time && (
        <div className="mt-1 px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded-full self-end">
          {time}
        </div>
      )}
    </div>
  )
}

const Bubble: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-3 bg-gray-100 rounded-xl max-w-sm">{children}</div>
)

const PlaceholderBubble: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center w-full h-32 min-w-[8rem] min-h-[10rem] bg-gray-200 text-gray-500 text-sm rounded-xl">
    <Loader2 className="animate-spin h-7 w-7 text-gray-400 mb-2" />
    {label ?? <p className="px-4">{label}</p>}
  </div>
)

const ImageMedia: React.FC<{ mediaUrl?: string }> = ({ mediaUrl }) => {
  if (!mediaUrl) return <PlaceholderBubble label="no image" />
  return (
    <div className="flex justify-center">
      <img
        src={mediaUrl}
        alt={'Image'}
        loading="lazy"
        className="max-w-[10rem] max-h-60 object-cover rounded-lg"
      />
    </div>
  )
}

const AudioMedia: React.FC<{
  metadata: DocumentMediaData
  mediaUrl?: string
}> = ({ metadata, mediaUrl }) => {
  const waveform = (
    metadata.document?.attributes?.find(
      (attr) => 'waveform' in attr
    ) as AudioDocumentAttributeData
  )?.waveform
  const mime = metadata.document?.mimeType || 'audio/mpeg'

  if (!mediaUrl)
    return <div className="p-2 text-sm text-gray-500">loading audio...</div>

  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      {waveform && (
        <div className="flex items-end h-8 gap-[1px] w-full">
          {Array.from(waveform).map((value, index) => (
            <div
              key={index}
              className="flex-1 bg-blue-500 rounded-sm"
              style={{ height: `${(value / 255) * 100}%`, opacity: 0.9 }}
            />
          ))}
        </div>
      )}

      <audio controls className="max-w-full">
        <source src={mediaUrl} type={mime} />
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}

const VideoMedia: React.FC<{
  mediaUrl?: string
  metadata: DocumentMediaData
}> = ({ mediaUrl, metadata }) => {
  if (!mediaUrl) return <PlaceholderBubble label="no video" />

  const mime = metadata.document?.mimeType?.toLowerCase() || 'video/mp4'
  const thumbUrl = metadata.document
    ? getThumbURL(metadata.document)
    : undefined

  return (
    <video
      controls
      className="w-full h-auto rounded-lg object-contain bg-muted"
      poster={thumbUrl}
    >
      <source src={mediaUrl} type={mime} />
      Your browser does not support the video tag.
    </video>
  )
}

const GifMedia: React.FC<{
  mediaUrl?: string
  metadata?: DocumentMediaData
}> = ({ mediaUrl, metadata }) => {
  if (!mediaUrl) return <PlaceholderBubble label="no gif" />

  const mime = metadata?.document?.mimeType?.toLowerCase() || 'video/mp4'

  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      className="w-full max-h-96 rounded-lg"
    >
      <source src={mediaUrl} type={mime} />
      Your browser does not support the video tag.
    </video>
  )
}

const GeoMedia: React.FC<{ metadata: GeoLiveMediaData | VenueMediaData }> = ({
  metadata,
}) => {
  const geo = metadata.geo
  if (!metadata.geo && metadata.type !== 'venue') {
    return <PlaceholderBubble label="No geolocation available" />
  }

  const mapsUrl = geo
    ? `https://www.google.com/maps?q=${geo.lat},${geo.long}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        (metadata as VenueMediaData).title
      )}`

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-muted rounded-lg p-3 shadow-sm hover:bg-gray-100 transition"
    >
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 shrink-0">
        <MapPin className="w-4 h-4 text-white" />
      </span>

      <div className="text-left">
        {metadata.type === 'venue' ? (
          <div className="text-sm text-gray-700">
            <div className="font-medium">{metadata.title}</div>
            <div className="text-xs text-gray-500">{metadata.address}</div>
          </div>
        ) : (
          <div className="text-blue-600 text-sm">
            {geo!.lat.toFixed(5)}, {geo!.long.toFixed(5)}
          </div>
        )}
      </div>
    </a>
  )
}

const PoolMedia: React.FC<{ metadata: PollMediaData }> = ({ metadata }) => {
  const { poll, results } = metadata
  const totalVoters = results.totalVoters ?? 0

  const decodeOption = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

  const isQuiz = !!poll.quiz
  const isMultipleChoice = !!poll.multipleChoice

  return (
    <div className="w-full min-w-[280px] max-w-md space-y-3 rounded-lg bg-muted p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">
          {poll.question.text}
        </h3>
        <p className="text-xs text-gray-500">{isQuiz ? 'Quiz' : 'Poll'}</p>
      </div>

      <div className="space-y-2">
        {poll.answers.map((answer, index) => {
          const optionKey = decodeOption(answer.option)
          const answerResult = results.results?.find(
            (r) => decodeOption(r.option) === optionKey
          )

          const chosen = answerResult?.chosen
          const correct = answerResult?.correct
          const voters = answerResult?.voters ?? 0
          const percent = totalVoters ? (voters / totalVoters) * 100 : 0

          return (
            <div key={index}>
              <div className="flex items-center justify-between text-sm">
                <span
                  className={cn(
                    'flex-1 text-gray-700',
                    chosen && 'font-medium text-blue-700',
                    correct && isQuiz && 'text-green-700'
                  )}
                >
                  {answer.text.text}
                </span>
                <div className="ml-2 flex items-center gap-1 text-xs text-gray-500">
                  {voters} vote{voters !== 1 && 's'}
                  {isQuiz && correct && (
                    <CheckCircle className="ml-1 h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>
              <div className="mt-1 h-1.5 w-full rounded bg-gray-300">
                <div
                  className={cn('h-full rounded', {
                    'bg-blue-500': chosen,
                    'bg-green-500': isQuiz && correct && !chosen,
                    'bg-gray-500': !chosen && !correct,
                  })}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-xs text-gray-500">
        Total votes: {totalVoters}
        {isMultipleChoice && ' • Multiple choice'}
      </div>
    </div>
  )
}

const WebPageMedia: React.FC<{ metadata: WebPageMediaData }> = ({
  metadata,
}) => {
  const webpage = metadata.webpage
  const isUnavailable =
    !webpage || webpage.type === 'pending' || webpage.type === 'not-modified'
  const url = !isUnavailable && (webpage as DefaultWebPageData).url

  return (
    <a
      href={url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="relative min-w-[260px] w-full max-w-sm rounded-lg bg-muted p-4 no-underline hover:bg-muted/90 overflow-hidden block"
    >
      <div className="absolute top-3 right-3 text-blue-600">
        <ExternalLink className="h-4 w-4" />
      </div>

      <div className="flex flex-col text-sm text-gray-800 overflow-hidden">
        {!isUnavailable ? (
          <>
            {(webpage as DefaultWebPageData).siteName && (
              <span className="text-xs text-gray-500 mb-1 truncate">
                {(webpage as DefaultWebPageData).siteName}
              </span>
            )}
            {(webpage as DefaultWebPageData).title && (
              <span className="font-medium break-words line-clamp-2">
                {(webpage as DefaultWebPageData).title}
              </span>
            )}
            {(webpage as DefaultWebPageData).description && (
              <span className="text-gray-600 text-xs mt-1 line-clamp-2 break-words">
                {(webpage as DefaultWebPageData).description}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-gray-500">Preview not available</span>
        )}
      </div>
    </a>
  )
}

const FileMedia: React.FC<{
  metadata: DocumentMediaData
  mediaUrl?: string
}> = ({ mediaUrl, metadata }) => {
  const fileName =
    metadata.document?.attributes?.find((attr) => 'fileName' in attr)
      ?.fileName || 'Unknown File'
  const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE'

  const thumbUrl = metadata.document
    ? getThumbURL(metadata.document)
    : undefined

  const handleClick = () => {
    if (fileExtension === 'PDF') {
      setShowPreview(true)
    }
  }

  const [showPreview, setShowPreview] = useState(false)

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full text-left flex items-center gap-3 p-3 bg-gray-100 rounded-lg hover:bg-gray-200"
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt="File Thumbnail"
            loading="lazy"
            className="w-12 h-12 object-cover rounded-md"
          />
        ) : (
          <File size={30} color="#1D4ED8" />
        )}

        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-800 truncate">
            {fileName}
          </span>
          <span className="text-xs text-gray-500">{fileExtension}</span>
        </div>
      </button>

      {showPreview && (
        <PdfView
          fileName={fileName}
          mediaUrl={mediaUrl}
          showPreview={() => setShowPreview(false)}
        />
      )}
    </>
  )
}

const PdfView: React.FC<{
  fileName: string
  mediaUrl?: string
  showPreview: () => void
}> = ({ fileName, mediaUrl, showPreview }) => {
  const [numPages, setNumPages] = useState<null | number>(null)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex flex-col">
      <div className="flex justify-between items-center p-3 bg-white">
        <h3 className="font-medium truncate">{fileName}</h3>
        <button
          onClick={showPreview}
          className="p-2 rounded-full hover:bg-gray-100"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        {mediaUrl ? (
          <Document
            file={mediaUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<p className="text-center">Loading PDF...</p>}
          >
            {Array.from(new Array(numPages), (_, index) => (
              <div
                key={`page_${index + 1}`}
                className="flex justify-center mb-6"
              >
                <div className="mb-4 bg-white shadow-md">
                  <Page
                    pageNumber={index + 1}
                    width={Math.min(window.innerWidth * 0.9, 800)}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </div>
              </div>
            ))}
          </Document>
        ) : (
          <p className="text-center text-gray-500">No PDF to display.</p>
        )}
      </div>
    </div>
  )
}

const TgStickerMedia: React.FC<{
  metadata: DocumentMediaData
  mediaUrl?: string
}> = ({ metadata, mediaUrl }) => {
  const [lottieData, setLottieData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useFallback, setUseFallback] = useState(false)
  const lottieRef = useRef<any>(null)

  useEffect(() => {
    const loadTgsSticker = async () => {
      if (!mediaUrl) {
        setIsLoading(false)
        setError('No media URL provided')
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Fetch the .tgs file
        const response = await fetch(mediaUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch sticker: ${response.status}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const compressed = new Uint8Array(arrayBuffer)

        // Decompress the gzipped JSON
        const decompressed = inflate(compressed, { to: 'string' })
        const lottieJson = JSON.parse(decompressed)

        // Validate that it's a proper Lottie animation
        if (!lottieJson.v || !lottieJson.fr || !lottieJson.layers) {
          throw new Error('Invalid Lottie animation data')
        }

        setLottieData(lottieJson)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load TGS sticker:', err)
        setError(err instanceof Error ? err.message : 'Failed to load sticker')
        setUseFallback(true)
        setIsLoading(false)
      }
    }

    loadTgsSticker()
  }, [mediaUrl])

  if (!mediaUrl) {
    return <PlaceholderBubble label="No Sticker" />
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center">
        <div className="flex items-center justify-center w-32 h-32 bg-gray-100 rounded-lg">
          <Loader2 className="animate-spin h-6 w-6 text-gray-400" />
        </div>
      </div>
    )
  }

  // Show error fallback
  if (error || useFallback) {
    return <PlaceholderBubble label="Telegram Sticker" />
  }

  // Render Lottie animation
  return (
    <div className="flex justify-center">
      <div className="w-32 h-32 flex items-center justify-center">
        <Lottie
          lottieRef={lottieRef}
          animationData={lottieData}
          loop={true}
          autoplay={true}
          style={{
            width: '100%',
            height: '100%',
            maxWidth: '128px',
            maxHeight: '128px',
          }}
          onError={(error) => {
            console.error('Lottie playback error:', error)
            setUseFallback(true)
          }}
        />
      </div>
    </div>
  )
}

// Unknown Media Fallback
const UnknownMedia: React.FC = () => {
  return <PlaceholderBubble label="unknown media" />
}

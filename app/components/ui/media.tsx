"use client"

import React from "react"
import { File } from 'lucide-react'
import { decodeStrippedThumb, toJPGDataURL } from "@/lib/utils"
import { AudioDocumentAttributeData, DocumentMediaData, MediaData, } from "@/api"
interface MediaProps {
  mediaUrl?: string
  metadata: MediaData
}

const getDocumentType = (media: DocumentMediaData) => {
  if (media.video) return 'video'
  if (media.voice) return 'audio'

  if (media.document) {
    const mime = media.document?.mimeType?.toLowerCase() || ''
    const fileName = media.document?.attributes?.find(a => 'fileName' in a)?.fileName?.toLowerCase() || ''

    if (mime.startsWith('video/')) return 'animated'
    if (mime.startsWith('image/')) return 'image'
    if (mime === 'application/pdf') return 'pdf'
    if (mime === 'application/zip' || /\.zip$|\.rar$|\.7z$/.test(fileName)) return 'archive'
  }

  return 'other'
}

export const Media: React.FC<MediaProps> = ({mediaUrl, metadata}) => {
  
  switch (metadata.type){
    case 'photo': {
      return <Bubble><ImageMedia mediaUrl={mediaUrl} /></Bubble>
    }
    case 'document': {
      const docType = getDocumentType(metadata)

      switch (docType) {
        case 'animated': {
          return <Bubble><AnimationMedia mediaUrl={mediaUrl} /></Bubble>
        }
        case 'image': {
          return <Bubble><ImageMedia mediaUrl={mediaUrl} /></Bubble>
        }
        case "video": {
          return <Bubble><VideoMedia mediaUrl={mediaUrl} /></Bubble>
        }
        case "audio": {
          return <Bubble><AudioMedia metadata={metadata} mediaUrl={mediaUrl} /></Bubble>
        }
        default: {
          return <Bubble><FileMedia metadata={metadata} mediaUrl={mediaUrl} /></Bubble>
        }
        
      }
    }
    default:
      return <Bubble><UnknownMedia /></Bubble>
  }
}

// export const Media: React.FC<MediaProps> = ({ mediaType, mediaUrl, altText }) => {
//   switch (mediaType) {
//     case 'image':
//       return <Bubble><ImageMedia mediaUrl={mediaUrl} altText={altText} /></Bubble>
//     case 'audio':
//       return <Bubble><AudioMedia mediaUrl={mediaUrl} /></Bubble>
//     case 'video':
//       return <Bubble><VideoMedia mediaUrl={mediaUrl} /></Bubble>
//     case 'file':
//       return <Bubble><FileMedia mediaUrl={mediaUrl} /></Bubble>
//     default:
//       return <Bubble><UnknownMedia /></Bubble>
//   }
// }

const Bubble: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-3 bg-muted rounded-xl max-w-sm">
    {children}
  </div>
)

const PlaceholderBubble: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center justify-center w-full h-32 bg-gray-200 text-gray-500 text-sm rounded-xl">
    {label}
  </div>
)

const ImageMedia: React.FC<{ mediaUrl?: string }> = ({ mediaUrl }) => {
  if (!mediaUrl) return <PlaceholderBubble label="No image available" />
  return (
    <div className="flex justify-center">
      <img
        src={mediaUrl}
        alt={'Image'}
        className="max-w-[10rem] max-h-60 object-cover rounded-lg"
      />
    </div>
  )
}

const AudioMedia: React.FC<{ metadata: DocumentMediaData; mediaUrl?: string }> = ({metadata, mediaUrl }) => {
  const waveform = (metadata.document?.attributes?.find(attr => 'waveform' in attr) as AudioDocumentAttributeData)?.waveform
  const mime = metadata.document?.mimeType || 'audio/mpeg'

  if (!mediaUrl) return <div className="p-2 text-sm text-gray-500">No audio available</div>

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
)}


const VideoMedia: React.FC<{ mediaUrl?: string }> = ({ mediaUrl }) => {
  if (!mediaUrl) return <PlaceholderBubble label="No video available" />
  return (
    <video controls className="w-full max-h-96 rounded-lg">
      <source src={mediaUrl} type="video/mp4" />
      video
    </video>
  )
}

const AnimationMedia: React.FC<{ mediaUrl?: string }> = ({ mediaUrl }) => {
  if (!mediaUrl) return <PlaceholderBubble label="No video available" />
  return (
    <video autoPlay loop muted className="w-full max-h-96 rounded-lg">
      <source src={mediaUrl} type="video/mp4" />
      video
    </video>
  )
}

const FileMedia: React.FC<{ metadata: DocumentMediaData, mediaUrl?: string }> = ({ mediaUrl, metadata }) => {
  const fileName = metadata.document?.attributes?.find(attr => 'fileName' in attr)?.fileName || 'Unknown File'
  const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE'

  if(fileName === 'Unknown File')console.log(JSON.stringify(metadata))
  
  // @ts-ignore
  const thumbBytes = metadata.document?.thumbs?.[0].bytes
  const thumbUrl = thumbBytes ? toJPGDataURL(decodeStrippedThumb(thumbBytes as Uint8Array)) : null

  return (
    <a
      href={mediaUrl}
      className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg hover:bg-gray-200"
      target="_blank"
      rel="noopener noreferrer"
    >
      
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt="File Thumbnail"
          className="w-12 h-12 object-cover rounded-md"
        />
      ) : (
        <File size={30} color="#1D4ED8" />
      )}
      
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-800 truncate">{fileName}</span>
        <span className="text-xs text-gray-500">{fileExtension}</span>
      </div>
    </a>
  )
}

// Unknown Media Fallback
const UnknownMedia: React.FC = () => {
  return <PlaceholderBubble label="unknown media" />
}

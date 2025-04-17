"use client"

import * as React from "react"

interface MediaProps {
  mediaType: 'image' | 'audio' | 'video' | 'file'
  mediaUrl?: string
  altText?: string
}

export const Media: React.FC<MediaProps> = ({ mediaType, mediaUrl, altText }) => {
  switch (mediaType) {
    case 'image':
      return <Bubble><ImageMedia mediaUrl={mediaUrl} altText={altText} /></Bubble>
    case 'audio':
      return <Bubble><AudioMedia mediaUrl={mediaUrl} /></Bubble>
    case 'video':
      return <Bubble><VideoMedia mediaUrl={mediaUrl} /></Bubble>
    case 'file':
      return <Bubble><FileMedia mediaUrl={mediaUrl} /></Bubble>
    default:
      return <Bubble><UnknownMedia /></Bubble>
  }
}

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

// Image Media Component
const ImageMedia: React.FC<{ mediaUrl?: string; altText?: string }> = ({ mediaUrl, altText }) => {
  if (!mediaUrl) return <PlaceholderBubble label="No image available" />
  return (
    <div className="flex justify-center">
      <img
        src={mediaUrl}
        alt={altText || 'Image'}
        className="max-w-[10rem] max-h-60 object-cover rounded-lg"
      />
    </div>
  )
}

// Audio Media Component
const AudioMedia: React.FC<{ mediaUrl?: string }> = ({ mediaUrl }) => {
  if (!mediaUrl) return <PlaceholderBubble label="No audio available" />
  return (
    <audio controls className="w-full">
      <source src={mediaUrl} type="audio/mpeg" />
      audio
    </audio>
  )
}

// Video Media Component
const VideoMedia: React.FC<{ mediaUrl?: string }> = ({ mediaUrl }) => {
  if (!mediaUrl) return <PlaceholderBubble label="No video available" />
  return (
    <video controls className="w-full max-h-96 rounded-lg">
      <source src={mediaUrl} type="video/mp4" />
      video
    </video>
  )
}

// File Media Component
const FileMedia: React.FC<{ mediaUrl?: string }> = ({ mediaUrl }) => {
  if (!mediaUrl) return <PlaceholderBubble label="No file available" />
  return (
    <a
      href={mediaUrl}
      className="text-blue-600 hover:underline font-medium break-all"
      target="_blank"
      rel="noopener noreferrer"
    >
        File
    </a>
  )
}

// Unknown Media Fallback
const UnknownMedia: React.FC = () => {
  return <PlaceholderBubble label="Unknown media type" />
}

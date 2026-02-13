import { createRef } from "react"

// Shared mutable refs used across the episode player components.
// Using { current: ... } objects (plain refs) so they persist across renders
// without triggering re-renders, and can be shared between modules.

export const hlsRef: { current: any } = { current: null }
export const videoRef = createRef<HTMLVideoElement>()
export const iframeRef = createRef<HTMLIFrameElement>()
export const currentPathRef: { current: string | null } = { current: null }
export const lastSentSecRef: { current: number } = { current: 0 }
export const lastSentAtRef: { current: number } = { current: 0 }
export const hasNavigatedToNextRef: { current: boolean } = { current: false }

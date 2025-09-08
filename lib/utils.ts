import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const OBFUSCATION_KEY = "anizone2024"

export function obfuscateUrl(url: string): string {
  try {
    // Simple obfuscation: base64 encode + character substitution
    const encoded = btoa(encodeURIComponent(url))
    // Character substitution to make it less obvious it's base64
    const obfuscated = encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ".")

    // Add a simple prefix to make it look like a hash
    return `v${obfuscated}`
  } catch {
    return url
  }
}

export function deobfuscateUrl(obfuscatedUrl: string): string {
  try {
    // Remove prefix and reverse character substitution
    const withoutPrefix = obfuscatedUrl.startsWith("v") ? obfuscatedUrl.slice(1) : obfuscatedUrl
    const restored = withoutPrefix.replace(/-/g, "+").replace(/_/g, "/").replace(/\./g, "=")

    // Decode base64 and URI component
    const decoded = decodeURIComponent(atob(restored))
    return decoded
  } catch {
    return obfuscatedUrl
  }
}

export function obfuscateId(id: string): string {
  try {
    // Simple ID obfuscation for manga IDs
    const encoded = btoa(id)
    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ".")
  } catch {
    return id
  }
}

export function deobfuscateId(obfuscatedId: string): string {
  try {
    const restored = obfuscatedId.replace(/-/g, "+").replace(/_/g, "/").replace(/\./g, "=")
    return atob(restored)
  } catch {
    return obfuscatedId
  }
}

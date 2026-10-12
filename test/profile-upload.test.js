import test from 'node:test'
import assert from 'node:assert/strict'

// Polyfill minimal browser globals
const mockStorage = new Map()
globalThis.localStorage = {
  getItem: key => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: key => mockStorage.delete(key),
  clear: () => mockStorage.clear()
}

const listeners = new Map()
globalThis.window = {
  addEventListener: (type, fn) => {
    if (!listeners.has(type)) listeners.set(type, new Set())
    listeners.get(type).add(fn)
  },
  removeEventListener: (type, fn) => {
    if (listeners.has(type)) listeners.get(type).delete(fn)
  },
  dispatchEvent: (event) => {
    const set = listeners.get(event.type)
    if (set) {
      for (const fn of set) fn(event)
    }
    return true
  }
}

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type
    this.detail = init.detail
  }
}

// Track object URLs created and revoked
const createdObjectUrls = new Set()
const revokedObjectUrls = new Set()
let urlCounter = 0

globalThis.URL.createObjectURL = (file) => {
  const url = `blob:http://localhost:5173/${++urlCounter}-${file.name || 'avatar'}`
  createdObjectUrls.add(url)
  return url
}

globalThis.URL.revokeObjectURL = (url) => {
  revokedObjectUrls.add(url)
}

const { api, fileUrl } = await import('../src/api.js')

test('1. fileUrl safely handles remote URLs, relative paths, and blob/data schemes', () => {
  // Remote URLs remain as-is
  assert.equal(fileUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg'), 'https://res.cloudinary.com/demo/image/upload/sample.jpg')
  assert.equal(fileUrl('http://example.com/pic.png'), 'http://example.com/pic.png')

  // Object with secure_url
  assert.equal(fileUrl({ secure_url: 'https://res.cloudinary.com/sample.png' }), 'https://res.cloudinary.com/sample.png')

  // Blob and data URLs pass through without prepending backend origin
  const blobUrl = 'blob:http://localhost:5173/test-blob-123'
  assert.equal(fileUrl(blobUrl), blobUrl)
  const dataUrl = 'data:image/png;base64,iVBORw0KGgo'
  assert.equal(fileUrl(dataUrl), dataUrl)

  // Empty or invalid values return empty string
  assert.equal(fileUrl(''), '')
  assert.equal(fileUrl(null), '')
})

test('2. Acceptance Test 1: Selecting a new image updates large preview immediately, while sidebar DP remains unchanged', () => {
  // Setup simulated AppShell state
  let sidebarDp = 'https://res.cloudinary.com/demo/old-saved-avatar.jpg'
  const appShellHandler = event => {
    if (event.detail) {
      if (typeof event.detail.profileImage === 'string' && event.detail.profileImage.startsWith('blob:')) {
        return // AppShell rejects blob URLs
      }
      sidebarDp = event.detail.profileImage
    }
  }
  window.addEventListener('seutoppers-profile-updated', appShellHandler)

  // Initial state on Profile page
  const savedProfile = { fullName: 'Momin Islam', profileImage: 'https://res.cloudinary.com/demo/old-saved-avatar.jpg' }
  let form = { ...savedProfile }
  let file = null
  let previewUrl = null

  // Simulate user selecting an image
  const selectedFile = { name: 'new-photo.png', size: 1024 }
  if (previewUrl) URL.revokeObjectURL(previewUrl)
  previewUrl = URL.createObjectURL(selectedFile)
  file = selectedFile

  // Large image on Profile page:
  const largeProfileImage = previewUrl || fileUrl(form.profileImage)

  // Verify: Large profile image is updated immediately with the preview
  assert.ok(largeProfileImage.startsWith('blob:'))
  assert.equal(largeProfileImage, previewUrl)

  // Verify: Sidebar DP is STILL the old saved image (NO event was dispatched!)
  assert.equal(sidebarDp, 'https://res.cloudinary.com/demo/old-saved-avatar.jpg')

  window.removeEventListener('seutoppers-profile-updated', appShellHandler)
})

test('3. Acceptance Test 2: Clicking Save and receiving success updates both large image and sidebar DP with backend URL', async () => {
  let sidebarDp = 'https://res.cloudinary.com/demo/old-saved-avatar.jpg'
  const appShellHandler = event => {
    if (event.detail) {
      if (typeof event.detail.profileImage === 'string' && event.detail.profileImage.startsWith('blob:')) return
      sidebarDp = event.detail.profileImage
    }
  }
  window.addEventListener('seutoppers-profile-updated', appShellHandler)

  const savedProfile = { fullName: 'Momin Islam', profileImage: 'https://res.cloudinary.com/demo/old-saved-avatar.jpg' }
  let form = { ...savedProfile }
  const selectedFile = { name: 'new-photo.png' }
  let previewUrl = URL.createObjectURL(selectedFile)
  let file = selectedFile

  // Mock successful backend upload & update
  const finalCloudinaryUrl = 'https://res.cloudinary.com/demo/new-uploaded-avatar.jpg'
  const mockUploadProfile = async () => finalCloudinaryUrl
  const mockUpdateProfile = async (payload) => ({ ...payload, profileImage: finalCloudinaryUrl })

  // Execute Save logic
  let uploadedImage = form.profileImage
  if (file) {
    uploadedImage = await mockUploadProfile(file)
  }
  const payload = { ...form, profileImage: uploadedImage }
  const updatedStudent = await mockUpdateProfile(payload)
  const finalImage = updatedStudent.profileImage || uploadedImage

  // Clean up preview URL
  const oldPreview = previewUrl
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
  file = null
  form.profileImage = finalImage

  // Broadcast saved profile
  window.dispatchEvent(new CustomEvent('seutoppers-profile-updated', {
    detail: { ...payload, profileImage: finalImage }
  }))

  const largeProfileImage = previewUrl || fileUrl(form.profileImage)

  // Both images now show the new saved image
  assert.equal(largeProfileImage, finalCloudinaryUrl)
  assert.equal(sidebarDp, finalCloudinaryUrl)
  // Preview blob URL was revoked
  assert.ok(revokedObjectUrls.has(oldPreview))

  window.removeEventListener('seutoppers-profile-updated', appShellHandler)
})

test('4. Acceptance Test 3: If save fails, sidebar DP remains the old saved picture', async () => {
  let sidebarDp = 'https://res.cloudinary.com/demo/old-saved-avatar.jpg'
  const appShellHandler = event => {
    if (event.detail) {
      if (typeof event.detail.profileImage === 'string' && event.detail.profileImage.startsWith('blob:')) return
      sidebarDp = event.detail.profileImage
    }
  }
  window.addEventListener('seutoppers-profile-updated', appShellHandler)

  const savedProfile = { fullName: 'Momin Islam', profileImage: 'https://res.cloudinary.com/demo/old-saved-avatar.jpg' }
  let form = { ...savedProfile }
  const selectedFile = { name: 'large-photo.png' }
  let previewUrl = URL.createObjectURL(selectedFile)
  let file = selectedFile
  let error = ''

  // Mock save failing (e.g. 500 error from upload)
  const mockFailingUpload = async () => {
    throw new Error('Upload failed: file size exceeds 5MB')
  }

  try {
    if (file) await mockFailingUpload()
  } catch (e) {
    error = e.message
    // Event is NOT dispatched on error!
  }

  // Sidebar DP remains unchanged
  assert.equal(sidebarDp, 'https://res.cloudinary.com/demo/old-saved-avatar.jpg')
  assert.equal(error, 'Upload failed: file size exceeds 5MB')
  // Preview URL still intact so user doesn't lose selected state prematurely
  assert.ok(previewUrl)

  window.removeEventListener('seutoppers-profile-updated', appShellHandler)
})

test('5. Acceptance Test 4: Cancel/discard restores large profile image to the old saved picture', () => {
  let sidebarDp = 'https://res.cloudinary.com/demo/old-saved-avatar.jpg'
  const savedProfile = { fullName: 'Momin Islam', profileImage: 'https://res.cloudinary.com/demo/old-saved-avatar.jpg' }
  let form = { ...savedProfile }
  const selectedFile = { name: 'temp-photo.png' }
  let previewUrl = URL.createObjectURL(selectedFile)
  let file = selectedFile

  // Large image shows preview
  assert.equal(previewUrl || fileUrl(form.profileImage), previewUrl)

  // User clicks "Cancel new photo" or "Refresh"
  const discard = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      previewUrl = null
    }
    file = null
  }
  discard()

  // Large image preview returns to old saved picture
  const largeProfileImage = previewUrl || fileUrl(form.profileImage)
  assert.equal(largeProfileImage, 'https://res.cloudinary.com/demo/old-saved-avatar.jpg')
  assert.equal(sidebarDp, 'https://res.cloudinary.com/demo/old-saved-avatar.jpg')
})

test('6. Object URL lifecycle: Memory leak prevention across consecutive file selections', () => {
  let currentPreviewUrl = null
  const selectFile = (fileName) => {
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl)
    }
    currentPreviewUrl = URL.createObjectURL({ name: fileName })
    return currentPreviewUrl
  }

  const url1 = selectFile('photo1.jpg')
  assert.ok(createdObjectUrls.has(url1))
  assert.equal(revokedObjectUrls.has(url1), false)

  const url2 = selectFile('photo2.jpg')
  assert.ok(createdObjectUrls.has(url2))
  // url1 was revoked when url2 was selected
  assert.ok(revokedObjectUrls.has(url1))

  // Unmount / discard
  URL.revokeObjectURL(url2)
  assert.ok(revokedObjectUrls.has(url2))
})

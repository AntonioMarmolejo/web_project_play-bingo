import { v2 as cloudinary } from 'cloudinary'

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

export function isCloudinaryConfigured() {
  return !!process.env.CLOUDINARY_CLOUD_NAME
}

export async function uploadFile(filePath) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'bingoscan',
    resource_type: 'auto',
  })
  return { url: result.secure_url, publicId: result.public_id }
}

export async function deleteFile(publicId) {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {})
}

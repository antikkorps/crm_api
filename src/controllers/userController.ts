import { Context } from "koa"
import { Role, User } from "../models"
import { paginatedQuery } from "../utils/pagination"
import { deleteFile, saveFile } from '../services/fileUploadService'
import { BadRequestError } from '../utils/errors'
import type {FileWithData} from '../types/fileUpload'
export const getAllUsers = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(User, ctx, {
      include: Role,
      where: { tenantId: ctx.state.user.tenantId },
      attributes: { exclude: ["password"] }, // Exclure le mot de passe
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getUserById = async (ctx: Context) => {
  try {
    const user = await User.findByPk(ctx.params.id, {
      include: Role,
      attributes: { exclude: ["password"] }, // Exclure le mot de passe
    })
    if (!user) {
      ctx.status = 404
      ctx.body = { error: "User not found" }
      return
    }
    ctx.body = user
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getUsersByTenant = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(User, ctx, {
      where: {
        tenantId: ctx.params.tenantId,
      },
      include: Role,
      attributes: { exclude: ["password"] }, // Exclure le mot de passe
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const createUser = async (ctx: Context) => {
  try {
    const user = await User.create((ctx.request as any).body)

    // Récupérer l'utilisateur créé sans le mot de passe
    const createdUser = await User.findByPk((user as any).id, {
      include: Role,
      attributes: { exclude: ["password"] },
    })

    ctx.status = 201
    ctx.body = createdUser
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const updateUser = async (ctx: Context) => {
  try {
    const user = await User.findByPk(ctx.params.id)
    if (!user) {
      ctx.status = 404
      ctx.body = { error: "User not found" }
      return
    }
    await user.update((ctx.request as any).body)

    // Récupérer l'utilisateur mis à jour sans le mot de passe
    const updatedUser = await User.findByPk(ctx.params.id, {
      include: Role,
      attributes: { exclude: ["password"] },
    })

    ctx.body = updatedUser
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const deleteUser = async (ctx: Context) => {
  try {
    const user = await User.findByPk(ctx.params.id)
    if (!user) {
      ctx.status = 404
      ctx.body = { error: "User not found" }
      return
    }
    await user.destroy()
    ctx.status = 204
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Upload an avatar for a user
 */
export const uploadAvatar = async (ctx: Context) => {
  try {
    const userId = ctx.params.id
    
    // Check if user exists
    const user = await User.findByPk(userId)
    if (!user) {
      ctx.status = 404
      ctx.body = { error: "User not found" }
      return
    }
    
    // Get the file from the request
    const file = ctx.request.files?.avatar
    
    if (!file) {
      throw new BadRequestError('No avatar file provided')
    }
    
    // Handle single file or array of files
    const fileData = Array.isArray(file) ? file[0] : file;
    
    // Cast the file to our interface
    const typedFile = fileData as unknown as FileWithData;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(typedFile.mimetype)) {
      throw new BadRequestError('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.')
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (typedFile.size > maxSize) {
      throw new BadRequestError('File too large. Maximum size is 5MB.')
    }
    
    // Delete old avatar if exists
    const oldAvatarUrl = user.get('avatarUrl') as string | null
    if (oldAvatarUrl) {
      await deleteFile(oldAvatarUrl)
    }
    
    // Save the new file
    const { path: avatarPath } = await saveFile(
      typedFile.data, 
      typedFile.name, 
      'avatars'
    )
    
    // Update the user with the new avatar URL
    await user.update({ avatarUrl: avatarPath })
    
    // Return success response
    ctx.body = {
      success: true,
      avatarUrl: avatarPath,
      user: {
        id: user.get('id'),
        email: user.get('email'),
        firstName: user.get('firstName'),
        lastName: user.get('lastName'),
        avatarUrl: avatarPath
      }
    }
  } catch (error: unknown) {
    // Pass error to error middleware
    throw error
  }
}

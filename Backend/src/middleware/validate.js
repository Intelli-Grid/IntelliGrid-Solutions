import { validationResult } from 'express-validator'
import { body, param, query } from 'express-validator'
import ApiError from '../utils/ApiError.js'
import mongoose from 'mongoose'

/**
 * Validate request and return errors if any
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => ({
            field: err.path,
            message: err.msg,
        }))

        throw ApiError.badRequest('Validation failed', errorMessages)
    }

    next()
}

/**
 * Common validation rules
 */
export const validationRules = {
    // Email validation
    email: () => body('email')
        .isEmail()
        .withMessage('Invalid email address')
        .normalizeEmail(),

    // Password validation
    password: () => body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain uppercase, lowercase, and number'),

    // MongoDB ObjectId validation
    objectId: (field = 'id') => param(field)
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid ID format'),

    // Pagination validation
    pagination: () => [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer')
            .toInt(),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
            .toInt(),
    ],

    // Tool validation
    createTool: () => [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Tool name is required')
            .isLength({ max: 200 })
            .withMessage('Tool name cannot exceed 200 characters'),
        body('officialUrl')
            .trim()
            .notEmpty()
            .withMessage('Official URL is required')
            .isURL()
            .withMessage('Invalid URL format'),
        body('shortDescription')
            .trim()
            .notEmpty()
            .withMessage('Short description is required')
            .isLength({ max: 500 })
            .withMessage('Short description cannot exceed 500 characters'),
        body('fullDescription')
            .trim()
            .notEmpty()
            .withMessage('Full description is required'),
        body('category')
            .optional()
            .custom((value) => !value || mongoose.Types.ObjectId.isValid(value))
            .withMessage('Invalid category ID'),
        body('pricing')
            .optional()
            .isIn(['Free', 'Freemium', 'Paid', 'Trial', 'Unknown'])
            .withMessage('Invalid pricing type'),
    ],

    // Review validation
    createReview: () => [
        body('tool')
            .notEmpty()
            .withMessage('Tool ID is required')
            .custom((value) => mongoose.Types.ObjectId.isValid(value))
            .withMessage('Invalid tool ID'),
        body('rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('title')
            .trim()
            .notEmpty()
            .withMessage('Review title is required')
            .isLength({ max: 100 })
            .withMessage('Title cannot exceed 100 characters'),
        body('content')
            .trim()
            .notEmpty()
            .withMessage('Review content is required')
            .isLength({ max: 2000 })
            .withMessage('Content cannot exceed 2000 characters'),
    ],

    // Category validation
    createCategory: () => [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Category name is required'),
        body('description')
            .trim()
            .notEmpty()
            .withMessage('Category description is required'),
    ],

    // User profile validation
    updateProfile: () => [
        body('firstName')
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('First name cannot exceed 50 characters'),
        body('lastName')
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('Last name cannot exceed 50 characters'),
        body('profile.bio')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Bio cannot exceed 500 characters'),
        body('profile.website')
            .optional()
            .trim()
            .isURL()
            .withMessage('Invalid website URL'),
    ],
}

export default validate

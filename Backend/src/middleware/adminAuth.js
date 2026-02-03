// Admin routes (protected)
app.use('/api/v1/admin', requireAuth, (req, res, next) => {
    // Check if user is admin
    if (req.auth?.sessionClaims?.metadata?.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        })
    }
    next()
})

import adminRoutes from './routes/admin.routes.js'
app.use('/api/v1/admin', adminRoutes)

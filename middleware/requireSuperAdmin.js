module.exports = function requireSuperAdmin(req, res, next) {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Session expired"
        });
    }

    if (req.session.user.role !== "superadmin") {
        return res.status(403).json({
            success: false,
            message: "Access denied"
        });
    }

    next();

};
module.exports = function requireCounterOrSuper(req, res, next) {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Session expired"
        });
    }

    if (
        req.session.user.role === "superadmin" ||
        req.session.user.role === "counter"
    ) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: "Access denied"
    });

};
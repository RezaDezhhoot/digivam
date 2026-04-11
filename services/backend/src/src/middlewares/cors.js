export function corsMiddleware(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Accept, Origin, Cache-Control, X-Requested-With"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, GET, OPTIONS, PUT, PATCH, DELETE"
    );
    res.setHeader("Access-Control-Max-Age", "21600");

    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
}
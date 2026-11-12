const { prisma } = require('../config/db');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * GET /api/v1/admin/audit
 *
 * Cursor-paginated admin activity trail, newest first.
 *
 * Cursor rather than offset paging: the table grows at its head, so an offset
 * page 2 fetched after a new entry lands would repeat a row it already showed.
 * The cursor is the id of the last row the client received.
 *
 * Query: ?limit=50&cursor=<id>&action=user.delete&targetType=project
 */
const listAuditLog = async (req, res, next) => {
    try {
        const requested = Number.parseInt(req.query.limit, 10);
        const limit = Number.isFinite(requested)
            ? Math.min(Math.max(requested, 1), MAX_LIMIT)
            : DEFAULT_LIMIT;

        const where = {};
        if (req.query.action) where.action = String(req.query.action);
        if (req.query.targetType) where.targetType = String(req.query.targetType);

        const cursor = req.query.cursor ? String(req.query.cursor) : null;

        // Fetch one extra row to learn whether another page exists without a
        // second count query.
        const rows = await prisma.adminAuditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            select: {
                id: true,
                actorId: true,
                actorEmail: true,
                action: true,
                targetType: true,
                targetId: true,
                targetLabel: true,
                metadata: true,
                createdAt: true,
                actor: { select: { id: true, name: true, email: true } },
            },
        });

        const hasMore = rows.length > limit;
        const entries = hasMore ? rows.slice(0, limit) : rows;

        res.status(200).json({
            success: true,
            count: entries.length,
            nextCursor: hasMore ? entries[entries.length - 1].id : null,
            entries,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { listAuditLog };
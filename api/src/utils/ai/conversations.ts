import run, { runInTransaction } from '#db'

const DELETE_RETENTION_SQL = `NOW() - INTERVAL '30 days'`

export async function listAiConversations(
    owner: AiConversationOwner,
    options: { deleted?: boolean } = {}
): Promise<AiConversationSummary[]> {
    await prepareOwnerScopedData(owner)

    const result = await run(`
        SELECT
            c.id,
            c.title,
            c.original_client_name,
            c.active_client_name,
            c.owner_user_id,
            c.owner_session_id,
            c.deleted_at,
            c.share_token,
            c.shared_from_conversation_id,
            c.created_at,
            c.updated_at,
            last_message.content AS last_message_preview,
            last_message.role AS last_message_role,
            COALESCE(message_count.count, 0)::int AS message_count
        FROM ai_conversations c
        LEFT JOIN LATERAL (
            SELECT role, content
            FROM ai_messages
            WHERE conversation_id = c.id
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        ) last_message ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS count
            FROM ai_messages
            WHERE conversation_id = c.id
        ) message_count ON true
        WHERE ${buildOwnerWhereClause(owner)}
          AND ${options.deleted ? `c.deleted_at IS NOT NULL AND c.deleted_at >= ${DELETE_RETENTION_SQL}` : 'c.deleted_at IS NULL'}
        ORDER BY c.updated_at DESC, c.created_at DESC
    `, buildOwnerParams(owner))

    return result.rows.map(mapConversationRow)
}

export async function getAiConversation(
    conversationId: string,
    owner?: AiConversationOwner,
    options: { allowDeleted?: boolean } = {}
): Promise<AiConversationRecord | null> {
    const params: string[] = [conversationId]
    const ownerWhere = owner ? `AND ${buildOwnerWhereClause(owner, 2)}` : ''
    if (owner) {
        params.push(...buildOwnerParams(owner))
    }

    const conversationResult = await run(`
        SELECT
            c.id,
            c.title,
            c.original_client_name,
            c.active_client_name,
            c.owner_user_id,
            c.owner_session_id,
            c.deleted_at,
            c.share_token,
            c.shared_from_conversation_id,
            c.created_at,
            c.updated_at,
            last_message.content AS last_message_preview,
            last_message.role AS last_message_role,
            COALESCE(message_count.count, 0)::int AS message_count
        FROM ai_conversations c
        LEFT JOIN LATERAL (
            SELECT role, content
            FROM ai_messages
            WHERE conversation_id = c.id
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        ) last_message ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS count
            FROM ai_messages
            WHERE conversation_id = c.id
        ) message_count ON true
        WHERE c.id = $1
          ${ownerWhere}
          ${options.allowDeleted ? '' : 'AND c.deleted_at IS NULL'}
        LIMIT 1
    `, params)

    const conversation = conversationResult.rows[0]
    if (!conversation) {
        return null
    }

    const messagesResult = await run(`
        SELECT id, role, content, error, client_name, created_at
        FROM ai_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC, id ASC
    `, [conversationId])

    return {
        ...mapConversationRow(conversation),
        messages: messagesResult.rows.map(mapMessageRow),
    }
}

export async function createAiConversation(clientName: string, owner: AiConversationOwner) {
    await prepareOwnerScopedData(owner)

    const conversationId = crypto.randomUUID()
    const title = 'New chat'

    await run(`
        INSERT INTO ai_conversations (
            id,
            title,
            original_client_name,
            active_client_name,
            owner_user_id,
            owner_session_id
        ) VALUES ($1, $2, $3, $3, $4, $5)
    `, [conversationId, title, clientName, owner.userId, owner.userId ? null : owner.sessionId])

    return await getAiConversation(conversationId, owner)
}

export async function deleteAiConversation(conversationId: string, owner: AiConversationOwner) {
    const result = await run(`
        UPDATE ai_conversations
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1
          AND ${buildOwnerWhereClause(owner, 2, '')}
          AND deleted_at IS NULL
    `, [conversationId, ...buildOwnerParams(owner)])

    return (result.rowCount || 0) > 0
}

export async function restoreAiConversation(conversationId: string, owner: AiConversationOwner) {
    const result = await run(`
        UPDATE ai_conversations
        SET deleted_at = NULL, updated_at = NOW()
        WHERE id = $1
          AND ${buildOwnerWhereClause(owner, 2, '')}
          AND deleted_at IS NOT NULL
    `, [conversationId, ...buildOwnerParams(owner)])

    return (result.rowCount || 0) > 0
}

export async function transferAiConversationToUser(
    conversationId: string,
    owner: AiConversationOwner,
    nextUserId: string
) {
    const result = await run(`
        UPDATE ai_conversations
        SET owner_user_id = $2, owner_session_id = NULL, updated_at = NOW()
        WHERE id = $1
          AND ${buildOwnerWhereClause(owner, 3, '')}
    `, [conversationId, nextUserId, ...buildOwnerParams(owner)])

    return (result.rowCount || 0) > 0
}

export async function importAiConversationsFromSession(userId: string, sessionId: string) {
    const result = await run(`
        UPDATE ai_conversations
        SET owner_user_id = $1, owner_session_id = NULL, updated_at = NOW()
        WHERE owner_session_id = $2
          AND owner_user_id IS NULL
    `, [userId, sessionId])

    return (result.rowCount || 0) > 0
}

export async function createAiConversationShare(conversationId: string, owner: AiConversationOwner) {
    const shareToken = crypto.randomUUID()
    const result = await run(`
        UPDATE ai_conversations
        SET share_token = COALESCE(share_token, $2), updated_at = NOW()
        WHERE id = $1
          AND ${buildOwnerWhereClause(owner, 3, '')}
        RETURNING share_token
    `, [conversationId, shareToken, ...buildOwnerParams(owner)])

    return result.rows[0]?.share_token || null
}

export async function copySharedAiConversation(shareToken: string, owner: AiConversationOwner) {
    await prepareOwnerScopedData(owner)

    const source = await getAiConversationByShareToken(shareToken)
    if (!source) {
        return null
    }

    const conversationId = crypto.randomUUID()

    await runInTransaction(async (client) => {
        await client.query(`
            INSERT INTO ai_conversations (
                id,
                title,
                original_client_name,
                active_client_name,
                owner_user_id,
                owner_session_id,
                shared_from_conversation_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            conversationId,
            source.title,
            source.originalClientName,
            source.activeClientName,
            owner.userId,
            owner.userId ? null : owner.sessionId,
            source.id,
        ])

        for (const message of source.messages) {
            await client.query(`
                INSERT INTO ai_messages (
                    id,
                    conversation_id,
                    role,
                    content,
                    error,
                    client_name,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
                crypto.randomUUID(),
                conversationId,
                message.role,
                message.content,
                message.error,
                message.clientName,
            ])
        }
    })

    return await getAiConversation(conversationId, owner)
}

export async function persistUserPrompt(
    conversationId: string,
    content: string,
    clientName: string | null
) {
    const trimmedContent = content.trim()
    if (!trimmedContent) {
        return
    }

    await runInTransaction(async (client) => {
        await client.query(`
            INSERT INTO ai_messages (
                id,
                conversation_id,
                role,
                content,
                client_name
            ) VALUES ($1, $2, 'user', $3, $4)
        `, [crypto.randomUUID(), conversationId, trimmedContent, clientName])

        await client.query(`
            UPDATE ai_conversations
            SET
                title = CASE
                    WHEN title = 'New chat' THEN $2
                    ELSE title
                END,
                active_client_name = COALESCE($3, active_client_name),
                updated_at = NOW()
            WHERE id = $1
              AND deleted_at IS NULL
        `, [conversationId, deriveTitle(trimmedContent), clientName])
    })
}

export async function persistAssistantResponse({
    conversationId,
    content,
    clientName,
    error = false,
}: {
    conversationId: string
    content: string
    clientName: string | null
    error?: boolean
}) {
    const trimmedContent = content.trim()
    if (!trimmedContent) {
        return
    }

    await runInTransaction(async (client) => {
        await client.query(`
            INSERT INTO ai_messages (
                id,
                conversation_id,
                role,
                content,
                error,
                client_name
            ) VALUES ($1, $2, 'assistant', $3, $4, $5)
        `, [crypto.randomUUID(), conversationId, trimmedContent, error, clientName])

        await client.query(`
            UPDATE ai_conversations
            SET
                active_client_name = COALESCE($2, active_client_name),
                updated_at = NOW()
            WHERE id = $1
              AND deleted_at IS NULL
        `, [conversationId, clientName])
    })
}

export async function switchAiConversationClient(
    conversationId: string,
    nextClientName: string,
    owner: AiConversationOwner
) {
    const conversation = await getAiConversation(conversationId, owner)
    if (!conversation) {
        return null
    }

    if (conversation.activeClientName === nextClientName) {
        return conversation
    }

    const summary = buildContinuationSummary(conversation, nextClientName)

    await runInTransaction(async (client) => {
        await client.query(`
            INSERT INTO ai_messages (
                id,
                conversation_id,
                role,
                content,
                client_name
            ) VALUES ($1, $2, 'system', $3, $4)
        `, [crypto.randomUUID(), conversationId, summary, nextClientName])

        await client.query(`
            UPDATE ai_conversations
            SET active_client_name = $2, updated_at = NOW()
            WHERE id = $1
        `, [conversationId, nextClientName])
    })

    return await getAiConversation(conversationId, owner)
}

export async function canOwnerAccessConversation(conversationId: string, owner: AiConversationOwner) {
    const result = await run(`
        SELECT 1
        FROM ai_conversations
        WHERE id = $1
          AND ${buildOwnerWhereClause(owner, 2)}
          AND deleted_at IS NULL
        LIMIT 1
    `, [conversationId, ...buildOwnerParams(owner)])

    return Boolean(result.rows[0])
}

async function getAiConversationByShareToken(shareToken: string) {
    const result = await run(`
        SELECT id
        FROM ai_conversations
        WHERE share_token = $1
          AND deleted_at IS NULL
        LIMIT 1
    `, [shareToken])

    const id = result.rows[0]?.id
    return id ? getAiConversation(id, undefined) : null
}

async function prepareOwnerScopedData(owner: AiConversationOwner) {
    await pruneDeletedAiConversations()

    if (owner.userId && owner.sessionId) {
        await importAiConversationsFromSession(owner.userId, owner.sessionId)
    }
}

async function pruneDeletedAiConversations() {
    await run(`
        DELETE FROM ai_conversations
        WHERE deleted_at IS NOT NULL
          AND deleted_at < ${DELETE_RETENTION_SQL}
    `)
}

function buildOwnerWhereClause(
    owner: AiConversationOwner,
    startIndex = 1,
    columnPrefix = 'c.'
) {
    if (owner.userId) {
        return `${columnPrefix}owner_user_id = $${startIndex}`
    }

    return `${columnPrefix}owner_user_id IS NULL AND ${columnPrefix}owner_session_id = $${startIndex}`
}

function buildOwnerParams(owner: AiConversationOwner) {
    return owner.userId ? [owner.userId] : [owner.sessionId || '']
}

function mapConversationRow(row: AiConversationRow): AiConversationSummary {
    return {
        id: row.id,
        title: row.title,
        originalClientName: row.original_client_name,
        activeClientName: row.active_client_name,
        ownerUserId: row.owner_user_id,
        ownerSessionId: row.owner_session_id,
        deletedAt: row.deleted_at,
        shareToken: row.share_token,
        sharedFromConversationId: row.shared_from_conversation_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastMessagePreview: truncatePreview(row.last_message_preview),
        lastMessageRole: row.last_message_role,
        messageCount: row.message_count,
    }
}

function mapMessageRow(row: AiMessageRow): AiStoredMessage {
    return {
        id: row.id,
        role: row.role,
        content: row.content,
        error: row.error,
        clientName: row.client_name,
        createdAt: row.created_at,
    }
}

function truncatePreview(content: string | null) {
    if (!content) {
        return null
    }

    const normalized = content.replace(/\s+/g, ' ').trim()
    return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized
}

function deriveTitle(content: string) {
    const normalized = content.replace(/\s+/g, ' ').trim()
    if (!normalized) {
        return 'New chat'
    }

    return normalized.length > 48 ? `${normalized.slice(0, 45)}...` : normalized
}

function buildContinuationSummary(conversation: AiConversationRecord, nextClientName: string) {
    const transcript = conversation.messages
        .filter((message) => message.role !== 'system')
        .slice(-8)
        .map((message) => `${capitalize(message.role)}: ${collapseWhitespace(message.content, 500)}`)
        .join('\n')

    const lastAssistantMessage = [...conversation.messages]
        .reverse()
        .find((message) => message.role === 'assistant' && !message.error)

    const lastAssistantSummary = lastAssistantMessage
        ? collapseWhitespace(lastAssistantMessage.content, 900)
        : 'No assistant reply has been recorded yet.'

    return [
        `Conversation handoff summary for ${nextClientName}.`,
        `The previous agent "${conversation.activeClientName}" is unavailable, so you are continuing this existing conversation.`,
        `Original agent: ${conversation.originalClientName}.`,
        `Conversation title: ${conversation.title}.`,
        '',
        'Most recent assistant context:',
        lastAssistantSummary,
        '',
        'Recent transcript:',
        transcript || 'No prior transcript is available.',
        '',
        'Continue seamlessly from this context. Do not mention the handoff unless the user asks about it.'
    ].join('\n')
}

function collapseWhitespace(content: string, maxLength: number) {
    const normalized = content.replace(/\s+/g, ' ').trim()
    return normalized.length > maxLength
        ? `${normalized.slice(0, maxLength - 3)}...`
        : normalized
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1)
}

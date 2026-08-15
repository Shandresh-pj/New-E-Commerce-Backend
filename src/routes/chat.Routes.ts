import { Router } from "express";
import { ChatController } from "../controllers/chat.Controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();
const chatController = new ChatController();

/**
 * @swagger
 * tags:
 *   name: Secure Chat & Calls
 *   description: Enterprise end-to-end encrypted messaging, statuses, directory, and WebRTC calls
 */

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     summary: Get Conversations
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user chat conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 101
 *                       type:
 *                         type: string
 *                         enum: [ONE_TO_ONE, GROUP, CHANNEL, BROADCAST]
 *                         example: "ONE_TO_ONE"
 *                       title:
 *                         type: string
 *                         example: "Direct Conversation"
 *                       last_message_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-08-14T12:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/chat/conversations", authenticateMiddleware, (req, res) => chatController.getConversations(req, res));

/**
 * @swagger
 * /chat/conversations:
 *   post:
 *     summary: Create Conversation
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - participant_user_ids
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [ONE_TO_ONE, GROUP, CHANNEL, BROADCAST]
 *                 example: "ONE_TO_ONE"
 *               title:
 *                 type: string
 *                 example: "Executive Direct Chat"
 *               participant_user_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2, 3]
 *     responses:
 *       200:
 *         description: Conversation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/chat/conversations", authenticateMiddleware, (req, res) => chatController.createConversation(req, res));

/**
 * @swagger
 * /chat/messages/{conversationId}:
 *   get:
 *     summary: Get Messages
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 101
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       conversation_id:
 *                         type: integer
 *                         example: 101
 *                       sender_id:
 *                         type: integer
 *                         example: 2
 *                       content:
 *                         type: string
 *                         example: "Hello team!"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-08-14T10:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/chat/messages/:conversationId", authenticateMiddleware, (req, res) => chatController.getMessages(req, res));

/**
 * @swagger
 * /chat/upload:
 *   post:
 *     summary: Upload Attachment or Voice Note
 *     description: Upload image, document, or audio attachment for chat message.
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 file_url:
 *                   type: string
 *                   example: "/uploads/chats/chat-123456789.png"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/chat/upload", authenticateMiddleware, (req, res) => chatController.uploadFile(req, res));

/**
 * @swagger
 * /chat/reactions:
 *   post:
 *     summary: Toggle Message Reaction
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message_id
 *               - emoji
 *             properties:
 *               message_id:
 *                 type: integer
 *                 example: 501
 *               emoji:
 *                 type: string
 *                 example: "👍"
 *     responses:
 *       200:
 *         description: Reaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Reaction updated"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/chat/reactions", authenticateMiddleware, (req, res) => chatController.toggleReaction(req, res));

/**
 * @swagger
 * /chat/directory:
 *   get:
 *     summary: Search Enterprise Employee & Team Directory
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         example: "John"
 *     responses:
 *       200:
 *         description: Directory search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 2
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                       email:
 *                         type: string
 *                         example: "john@example.com"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/chat/directory", authenticateMiddleware, (req, res) => chatController.searchDirectory(req, res));

/**
 * @swagger
 * /chat/calls/history:
 *   get:
 *     summary: Get Call History Logs
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Call history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       call_type:
 *                         type: string
 *                         example: "VIDEO"
 *                       status:
 *                         type: string
 *                         example: "ENDED"
 *                       duration_seconds:
 *                         type: integer
 *                         example: 320
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/chat/calls/history", authenticateMiddleware, (req, res) => chatController.getCallHistory(req, res));

/**
 * @swagger
 * /chat/statuses:
 *   get:
 *     summary: Get Company Member Status Updates
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status updates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       user_id:
 *                         type: integer
 *                         example: 2
 *                       text:
 *                         type: string
 *                         example: "In a meeting until 3 PM"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/chat/statuses", authenticateMiddleware, (req, res) => chatController.getStatuses(req, res));

/**
 * @swagger
 * /chat/statuses:
 *   post:
 *     summary: Create New Status Update
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 example: "In a meeting until 3 PM"
 *               media_url:
 *                 type: string
 *                 example: "/uploads/images/status-1.jpg"
 *               type:
 *                 type: string
 *                 example: "TEXT"
 *     responses:
 *       200:
 *         description: Status update posted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Status posted"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/chat/statuses", authenticateMiddleware, (req, res) => chatController.createStatus(req, res));

/**
 * @swagger
 * /chat/clear:
 *   post:
 *     summary: Clear Conversation Messages
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversation_id
 *             properties:
 *               conversation_id:
 *                 type: integer
 *                 example: 101
 *     responses:
 *       200:
 *         description: Chat cleared
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Chat cleared successfully"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/chat/clear", authenticateMiddleware, (req, res) => chatController.clearChat(req, res));

/**
 * @swagger
 * /chat/delete-conversation:
 *   post:
 *     summary: Delete Chat Conversation
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversation_id
 *             properties:
 *               conversation_id:
 *                 type: integer
 *                 example: 101
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Conversation deleted"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/chat/delete-conversation", authenticateMiddleware, (req, res) => chatController.deleteConversation(req, res));

/**
 * @swagger
 * /chat/keys:
 *   post:
 *     summary: Register E2EE Public Key
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversation_id
 *               - public_key
 *             properties:
 *               conversation_id:
 *                 type: integer
 *                 example: 101
 *               public_key:
 *                 type: string
 *                 example: "RSA-PUBLIC-KEY-BASE64..."
 *     responses:
 *       200:
 *         description: Public key registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Key registered"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/chat/keys", authenticateMiddleware, (req, res) => chatController.registerKey(req, res));

/**
 * @swagger
 * /chat/messages/{conversationId}:
 *   post:
 *     summary: Send Chat Message
 *     description: Posts a new chat message into conversation.
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 101
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Hello team!"
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/chat/messages/:conversationId", authenticateMiddleware, (req, res) => chatController.sendMessage(req, res));

/**
 * @swagger
 * /meetings:
 *   get:
 *     summary: List Team Meetings
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Meetings list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "Sprint Planning"
 *                       call_type:
 *                         type: string
 *                         example: "VIDEO"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create / Schedule Meeting
 *     tags: [Secure Chat & Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Sprint Planning"
 *               call_type:
 *                 type: string
 *                 enum: [AUDIO, VIDEO]
 *                 example: "VIDEO"
 *               invited_user_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2, 3]
 *     responses:
 *       200:
 *         description: Meeting created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Meeting initiated successfully"
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/meetings", authenticateMiddleware, (req, res) => chatController.getMeetings(req, res));
router.post("/meetings", authenticateMiddleware, (req, res) => chatController.createMeeting(req, res));
router.post("/meetings/:id/join", authenticateMiddleware, (req, res) => chatController.joinMeeting(req, res));
router.post("/meetings/:id/end", authenticateMiddleware, (req, res) => chatController.endMeeting(req, res));

export default router;

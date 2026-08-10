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
 *             properties:
 *               type:
 *                 type: string
 *                 example: ONE_TO_ONE
 *               title:
 *                 type: string
 *                 example: Executive Direct Chat
 *               participant_user_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2, 3]
 *     responses:
 *       200:
 *         description: Conversation created successfully
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
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
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image/Audio/Document file binary (Required)
 *               conversation_id:
 *                 type: integer
 *                 example: 101
 *                 description: Chat conversation ID
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: No file uploaded
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
 *             properties:
 *               message_id:
 *                 type: integer
 *               emoji:
 *                 type: string
 *                 example: 👍
 *     responses:
 *       200:
 *         description: Reaction updated successfully
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
 *     responses:
 *       200:
 *         description: Directory search results retrieved
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
 *         description: Status update posted
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
 *         description: Conversation deleted
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
 *         description: Public key registered
 */
router.post("/chat/keys", authenticateMiddleware, (req, res) => chatController.registerKey(req, res));

export default router;

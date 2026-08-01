import { Request, Response } from "express";
import { Controller, Get, Post, Middleware, Swagger } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { ChatService } from "../services/chat.service";
import { CallService } from "../services/call.service";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure file storage for secure media & voice notes
const uploadDir = path.join(process.cwd(), "uploads", "chats");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `chat-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
});

@Controller("/chat")
export class ChatController {
  private chatService = new ChatService();
  private callService = new CallService();

  @Get("/conversations")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Conversations", "Returns user's accessible chat conversations.")
  async getConversations(req: any, res: Response) {
    try {
      const userId = req.user.userId || req.user.id || req.user.user_id;
      const companyId = req.user.companyId || req.user.company_id || null;
      const branchId = req.user.branchId || req.user.branch_id;

      const conversations = await this.chatService.getUserConversations(userId, companyId, branchId);
      return res.json({ success: true, data: conversations });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post("/conversations")
  @Middleware([authenticateMiddleware])
  @Swagger("Create Conversation", "Creates a new 1-to-1, group, or team conversation.")
  async createConversation(req: any, res: Response) {
    try {
      const userId = req.user.userId || req.user.id || req.user.user_id;
      const companyId = req.user.companyId || req.user.company_id || null;

      const conversation = await this.chatService.createConversation({
        ...req.body,
        company_id: companyId,
        created_by: userId,
      });

      return res.json({ success: true, data: conversation });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Get("/messages/:conversationId")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Messages", "Fetch paginated chat messages.")
  async getMessages(req: any, res: Response) {
    try {
      const conversationId = Number(req.params.conversationId);
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 50);

      const result = await this.chatService.getMessages(conversationId, page, limit);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Get("/statuses")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Status Updates", "Returns dynamic status updates from company members.")
  async getStatuses(req: any, res: Response) {
    try {
      const companyId = req.user.companyId || req.user.company_id || 1;
      const statuses = await this.chatService.getCompanyStatuses(companyId);
      return res.json({ success: true, data: statuses });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post("/statuses")
  @Middleware([authenticateMiddleware])
  @Swagger("Create Status Update", "Posts a new status update.")
  async createStatus(req: any, res: Response) {
    try {
      const userId = req.user.userId || req.user.id || req.user.user_id;
      const status = await this.chatService.createStatus({ ...req.body, user_id: userId });
      return res.json({ success: true, data: status });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post("/upload")
  @Middleware([authenticateMiddleware, upload.single("file")])
  @Swagger("Upload File / Voice Note", "Uploads media attachment for chat.")
  async uploadFile(req: any, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      const fileUrl = `/uploads/chats/${req.file.filename}`;
      return res.json({
        success: true,
        data: {
          file_name: req.file.originalname,
          file_size: req.file.size,
          media_url: fileUrl,
          media_type: req.file.mimetype.startsWith("image/")
            ? "IMAGE"
            : req.file.mimetype.startsWith("audio/")
            ? "AUDIO_VOICE_NOTE"
            : req.file.mimetype.startsWith("video/")
            ? "VIDEO"
            : "FILE",
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post("/reactions")
  @Middleware([authenticateMiddleware])
  @Swagger("Toggle Reaction", "Adds or removes an emoji reaction on a message.")
  async toggleReaction(req: any, res: Response) {
    try {
      const userId = req.user.userId || req.user.id || req.user.user_id;
      const { message_id, emoji } = req.body;

      const message = await this.chatService.toggleReaction(message_id, userId, emoji);
      return res.json({ success: true, data: message });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Get("/directory")
  @Middleware([authenticateMiddleware])
  @Swagger("Search Directory", "Searches users and teams in company hierarchy.")
  async searchDirectory(req: any, res: Response) {
    try {
      const companyId = req.user.companyId || req.user.company_id || 1;
      const query = String(req.query.q || "");

      const results = await this.chatService.searchUsersAndTeams(companyId, query);
      return res.json({ success: true, data: results });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Get("/calls/history")
  @Middleware([authenticateMiddleware])
  @Swagger("Call History", "Retrieves call and meeting history.")
  async getCallHistory(req: any, res: Response) {
    try {
      const userId = req.user.userId || req.user.id || req.user.user_id;

      const history = await this.callService.getCallHistory(userId);
      return res.json({ success: true, data: history });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post("/keys")
  @Middleware([authenticateMiddleware])
  @Swagger("Register E2EE Public Key", "Registers user public key for conversation.")
  async registerKey(req: any, res: Response) {
    try {
      const userId = req.user.userId || req.user.id || req.user.user_id;
      const { conversation_id, public_key } = req.body;

      const result = await this.chatService.registerPublicKey(userId, conversation_id, public_key);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post("/clear")
  @Middleware([authenticateMiddleware])
  @Swagger("Clear Chat", "Deletes all messages in a conversation.")
  async clearChat(req: any, res: Response) {
    try {
      const { conversation_id } = req.body;
      const result = await this.chatService.clearChat(Number(conversation_id));
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post("/delete-conversation")
  @Middleware([authenticateMiddleware])
  @Swagger("Delete Conversation", "Deletes a conversation and its messages.")
  async deleteConversation(req: any, res: Response) {
    try {
      const userId = req.user.userId || req.user.id || req.user.user_id;
      const { conversation_id } = req.body;

      const result = await this.chatService.deleteConversation(Number(conversation_id), userId);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

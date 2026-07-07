import { Request, Response, NextFunction } from "express";
import axios from "axios";
import dataSource from "../config/database";
import { ProductApproval } from "../entities/productApproval";
import { ApiError } from "../exceptions/ApiError";

export class AiController {

  // ================= GENERATE PRODUCT DESCRIPTION =================
  async generateDescription(req: any, res: Response, next: NextFunction) {
    try {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        throw new ApiError(400, "GEMINI_API_KEY is not configured in the backend environment variables (.env). Please add it to enable AI features.");
      }

      const { name, category, price } = req.body;
      if (!name) {
        throw new ApiError(400, "Product name is required for description generation.");
      }

      const prompt = `Generate a compelling, professional, and SEO-optimized e-commerce product description for the following item:
Product Name: "${name}"
Category: "${category || 'General'}"
Price: "${price ? '$' + price : 'N/A'}"

Guidelines:
- Keep the tone engaging and premium.
- Highlight potential features and quality.
- Write it in complete paragraphs, under 150 words.
- Format it cleanly. Avoid any markdown code block formatting; return plain text only.`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        throw new ApiError(502, "Gemini API returned an empty or invalid response.");
      }

      return res.json({
        success: true,
        description: generatedText.trim()
      });
    } catch (err: any) {
      if (err.response) {
        console.error("Gemini API Error:", err.response.status, err.response.data);
        return next(new ApiError(502, `Gemini API failed: ${err.response.data?.error?.message || "Unknown error"}`));
      }
      next(err);
    }
  }

  // ================= AUDIT PENDING PRODUCT =================
  async auditProduct(req: any, res: Response, next: NextFunction) {
    try {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        throw new ApiError(400, "GEMINI_API_KEY is not configured in the backend environment variables (.env). Please add it to enable AI features.");
      }

      const approvalId = Number(req.body.approval_id);
      if (!approvalId) {
        throw new ApiError(400, "Approval request ID is required for AI audit.");
      }

      const approvalRepo = dataSource.getRepository(ProductApproval);
      const request = await approvalRepo.findOneBy({ id: approvalId });

      if (!request) {
        throw new ApiError(404, "Approval request not found.");
      }

      const data = request.new_values;

      const prompt = `You are an AI Product Quality Auditor for an enterprise e-commerce platform. Review this proposed product submission and provide a smart audit report.
Product Data:
- Name: "${data.name}"
- Category: "${data.category || 'General'}"
- Proposed Price: "$${data.price || '0.00'}"
- Proposed Stock: "${data.stock || '0'}"
- Product Type: "${data.product_type || 'single'}"
- Description: "${data.description || '(No description provided)'}"

Provide your audit formatted in these 4 markdown sections (with no other introductory or concluding text):

### 1. Quality & Safety Assessment
Evaluate if the name and description are descriptive, professional, and free of spam or clear grammatical issues. Note any missing info.

### 2. E-Commerce Pricing Sanity Check
Check if the price of $${data.price || '0.00'} is reasonable for an item named "${data.name}" in the "${data.category || 'General'}" category. Rate it as: Competitive, High, Low, or Suspicious.

### 3. SEO Projections
Suggest 3-5 keywords for tags. Propose an optimized product title for search engine visibility.

### 4. Auditor Recommendation
Give a clear recommendation: "APPROVE", "REJECT", or "CHANGES_REQUESTED" with a 1-sentence reason.`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const auditReport = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!auditReport) {
        throw new ApiError(502, "Gemini API returned an empty or invalid response.");
      }

      return res.json({
        success: true,
        auditReport: auditReport.trim()
      });
    } catch (err: any) {
      if (err.response) {
        console.error("Gemini API Error:", err.response.status, err.response.data);
        return next(new ApiError(502, `Gemini API failed: ${err.response.data?.error?.message || "Unknown error"}`));
      }
      next(err);
    }
  }
}

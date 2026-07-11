import { Router } from "express";
import { ProfitLossController } from "../controllers/profitLoss.controller";

const profitLossRouter = Router();

profitLossRouter.post("/profit-loss", ProfitLossController.create);
profitLossRouter.get("/profit-loss", ProfitLossController.getAll);
profitLossRouter.delete("/profit-loss/:id", ProfitLossController.delete);
profitLossRouter.post("/profit-loss/auto-calculate", ProfitLossController.autoCalculate);

export default profitLossRouter;

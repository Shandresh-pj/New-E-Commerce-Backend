import dataSource from "./src/config/database";
import { SubscriptionPlan } from "./src/entities/subscription-plan.entity";

async function run() {
  try {
    await dataSource.initialize();
    console.log("Connected to DB");
    
    const repo = dataSource.getRepository(SubscriptionPlan);
    
    const existing = await repo.find();
    if (existing.length > 0) {
       console.log("Plans already exist in DB. Cleaning up...");
       await repo.clear();
    }

    const starterPlan = repo.create({
      name: 'Starter Hub',
      badge: 'INSTANT TRIAL TO STARTER',
      monthly_price: 299,
      yearly_price: 2499,
      description: 'Perfect for small retailers & boutique stores launching multi-branch operations.',
      features: [
        { text: 'Up to 5,000 SKUs & 2 Branches', highlight: false },
        { text: '5 team user accounts (Shopkeeper / Staff)', highlight: false },
        { text: 'Real-time billing & automated receipt printing', highlight: false },
        { text: 'Basic inventory alerts & stock logs', highlight: false },
        { text: '14-Day Free Full-Access Trial Included', highlight: true }
      ],
      trial_days: 14,
      is_active: true
    });

    await repo.save(starterPlan);
    console.log("Successfully seeded 1 real plan into the database:", starterPlan);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

run();

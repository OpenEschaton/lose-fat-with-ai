-- First, drop the existing constraint
ALTER TABLE "public"."credits" DROP CONSTRAINT IF EXISTS "credits_user_id_fkey";

-- Then, add the new constraint with ON DELETE CASCADE
ALTER TABLE ONLY "public"."credits"
    ADD CONSTRAINT "credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
CREATE TABLE "model_provider_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"model_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_model_id" text NOT NULL,
	"last_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "model_provider_availability_model_id_provider_unique" UNIQUE("model_id","provider")
);
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_verified";--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "settings" SET DEFAULT '{"theme":"dark","accentColor":"green","fontSans":"rethink","fontMono":"jetbrains","defaultThreadName":"New Chat","defaultThreadIcon":"message-circle","landingPageContent":"suggestions","sendMessageKeyboardShortcut":"enter","autoThreadNaming":false,"autoThreadIcon":false,"showSidebarIcons":false,"useOcrForPdfs":false,"autoCreateFilesFromPaste":true,"inputHeightScale":0,"hideModelProviderNames":false,"profileCardWidget":"apiKeyStatus","autoArchiveAfterDays":0}';--> statement-breakpoint
CREATE INDEX "model_provider_availability_provider_idx" ON "model_provider_availability" ("provider");--> statement-breakpoint
ALTER TABLE "model_provider_availability" ADD CONSTRAINT "model_provider_availability_model_id_models_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("model_id");
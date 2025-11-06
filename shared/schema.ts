import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phoneE164: text("phone_e164").notNull().unique(),
  voiceType: text("voice_type").notNull().default('masc'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  twilioSid: text("twilio_sid"),
  toNumber: text("to_number").notNull(),
  fromNumber: text("from_number"),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"),
  recordingUrl: text("recording_url"),
  recordingStatus: text("recording_status"), // 'not_started', 'recording', 'paused', 'completed'
  metadata: jsonb("metadata"),
});

export const recordings = pgTable("recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").references(() => calls.id),
  twilioRecordingSid: text("twilio_recording_sid"),
  filename: text("filename").notNull(),
  status: text("status").notNull(), // 'recording', 'paused', 'completed', 'failed'
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  fileSize: integer("file_size"), // in bytes
  transcription: text("transcription"),
  metadata: jsonb("metadata"),
});

export const transcripts = pgTable("transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").references(() => calls.id),
  speaker: text("speaker").notNull(), // 'AI' | 'Human' | 'Remote'
  text: text("text").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  isFinal: boolean("is_final").default(false),
  confidence: integer("confidence"),
});

export const prompts = pgTable("prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").references(() => calls.id),
  prompt: text("prompt").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  applied: boolean("applied").default(false),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const voipNumbers = pgTable("voip_numbers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  number: text("number").notNull().unique(),
  provider: text("provider").notNull(),
  sipUsername: text("sip_username"),
  sipPassword: text("sip_password"),
  sipServer: text("sip_server"),
  sipPort: integer("sip_port").default(5060),
  sipIps: text("sip_ips"),
  isDefault: boolean("is_default").default(false),
  status: text("status").notNull().default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentSessions = pgTable("agent_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").references(() => calls.id).notNull(),
  systemPrompt: text("system_prompt").notNull(),
  temperature: integer("temperature").default(70),
  isActive: boolean("is_active").default(true),
  isPaused: boolean("is_paused").default(false),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  metadata: jsonb("metadata"),
});

export const agentMessages = pgTable("agent_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => agentSessions.id).notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata"),
});

export const effectPresets = pgTable("effect_presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  noiseReduction: boolean("noise_reduction").default(false),
  noiseReductionLevel: integer("noise_reduction_level").default(50),
  equalization: boolean("equalization").default(false),
  eqPreset: text("eq_preset"),
  amplification: boolean("amplification").default(false),
  amplificationGain: integer("amplification_gain").default(0),
  normalization: boolean("normalization").default(false),
  normalizationTarget: integer("normalization_target").default(-3),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const codecPreferences = pgTable("codec_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voipNumberId: integer("voip_number_id").references(() => voipNumbers.id),
  codecOrder: text("codec_order").array().notNull(),
  preferredCodec: text("preferred_codec").notNull().default('opus'),
  fallbackCodec: text("fallback_codec").notNull().default('pcmu'),
  allowG711: boolean("allow_g711").default(true),
  allowOpus: boolean("allow_opus").default(true),
  opusBitrate: integer("opus_bitrate").default(24000),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  startTime: true,
  endTime: true,
  duration: true,
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({
  id: true,
  startTime: true,
  endTime: true,
  duration: true,
  fileSize: true,
});

export const insertTranscriptSchema = createInsertSchema(transcripts).omit({
  id: true,
  timestamp: true,
});

export const insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  timestamp: true,
  applied: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  updatedAt: true,
});

export const insertVoipNumberSchema = createInsertSchema(voipNumbers, {
  id: z.number().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentSessionSchema = createInsertSchema(agentSessions).omit({
  id: true,
  startedAt: true,
  endedAt: true,
});

export const insertAgentMessageSchema = createInsertSchema(agentMessages).omit({
  id: true,
  timestamp: true,
});

export const insertEffectPresetSchema = createInsertSchema(effectPresets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodecPreferenceSchema = createInsertSchema(codecPreferences).omit({
  id: true,
  updatedAt: true,
});

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type InsertVoipNumber = z.infer<typeof insertVoipNumberSchema>;
export type InsertAgentSession = z.infer<typeof insertAgentSessionSchema>;
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;
export type InsertEffectPreset = z.infer<typeof insertEffectPresetSchema>;
export type InsertCodecPreference = z.infer<typeof insertCodecPreferenceSchema>;

export type Favorite = typeof favorites.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type Recording = typeof recordings.$inferSelect;
export type Transcript = typeof transcripts.$inferSelect;
export type Prompt = typeof prompts.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type VoipNumber = typeof voipNumbers.$inferSelect;
export type AgentSession = typeof agentSessions.$inferSelect;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type EffectPreset = typeof effectPresets.$inferSelect;
export type CodecPreference = typeof codecPreferences.$inferSelect;

// Validation schemas
export const phoneNumberSchema = z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid E.164 format");
export const dtmfToneSchema = z.enum(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#"]);
export const callStateSchema = z.enum(["IDLE", "RINGING", "CONNECTED", "ENDED"]);
export const speakerSchema = z.enum(["AI", "Human", "Remote"]);
export const providerSchema = z.enum(["vapi", "retell", "twilio", "mock", "falevono", "sobreip"]);

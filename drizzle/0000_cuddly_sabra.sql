CREATE TABLE `apiSettings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`provider` text NOT NULL,
	`apiKey` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `enrichmentJobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`leadId` integer NOT NULL,
	`enrichmentType` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`result` text,
	`error` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`firstName` text,
	`lastName` text,
	`title` text,
	`email` text,
	`phone` text,
	`linkedinUrl` text,
	`companyName` text,
	`companyWebsite` text,
	`industry` text,
	`companySize` text,
	`location` text,
	`country` text,
	`googlePlaceId` text,
	`googleRating` text,
	`googleReviewCount` integer,
	`address` text,
	`status` text DEFAULT 'new' NOT NULL,
	`source` text DEFAULT 'manual',
	`notes` text,
	`tags` text,
	`enrichmentStatus` text DEFAULT 'none' NOT NULL,
	`lastEnrichedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scrapeJobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`industry` text,
	`jobTitle` text,
	`location` text,
	`companySize` text,
	`keywords` text,
	`maxResults` integer DEFAULT 50,
	`scrapeMode` text DEFAULT 'google_places',
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` integer DEFAULT 0,
	`totalFound` integer DEFAULT 0,
	`savedCount` integer DEFAULT 0,
	`errorMessage` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`lastSignedIn` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);
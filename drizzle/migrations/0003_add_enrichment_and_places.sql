-- Migration: Add Google Places fields, enrichment tracking, new tables
-- Run against your MySQL database after deploying

-- Add new columns to leads table
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `googlePlaceId` varchar(512);
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `googleRating` varchar(16);
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `googleReviewCount` int;
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `address` varchar(512);
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `enrichmentStatus` enum('none','partial','complete') NOT NULL DEFAULT 'none';
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `lastEnrichedAt` timestamp;

-- Add scrapeMode to scrapeJobs
ALTER TABLE `scrapeJobs` ADD COLUMN IF NOT EXISTS `scrapeMode` varchar(32) DEFAULT 'google_places';

-- Create enrichmentJobs table
CREATE TABLE IF NOT EXISTS `enrichmentJobs` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `leadId` int NOT NULL,
  `enrichmentType` varchar(64) NOT NULL,
  `status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `result` text,
  `error` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create apiSettings table
CREATE TABLE IF NOT EXISTS `apiSettings` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `provider` varchar(64) NOT NULL,
  `apiKey` varchar(512) NOT NULL,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

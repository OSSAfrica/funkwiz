CREATE TABLE `email_delivery_settings` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

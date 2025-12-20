-- Add parentReplyId column to ReviewReply table for nested replies
ALTER TABLE "ReviewReply" ADD COLUMN "parentReplyId" INTEGER;

-- Add foreign key constraint for self-referential relationship
ALTER TABLE "ReviewReply" 
ADD CONSTRAINT "ReviewReply_parentReplyId_fkey" 
FOREIGN KEY ("parentReplyId") 
REFERENCES "ReviewReply"("id") 
ON UPDATE CASCADE 
ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX "ReviewReply_parentReplyId_idx" ON "ReviewReply"("parentReplyId");

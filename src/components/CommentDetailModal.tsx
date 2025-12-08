import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectComment } from "@/hooks/useProjectComments";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2 } from "lucide-react";

interface CommentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  comment: ProjectComment | null;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string) => void;
  canEdit?: boolean;
  allComments?: ProjectComment[]; // All comments to find replies
}

export const CommentDetailModal = ({
  isOpen,
  onClose,
  comment,
  onDelete,
  onEdit,
  canEdit = false,
  allComments = [],
}: CommentDetailModalProps) => {
  if (!comment) return null;

  // Find replies to this comment
  const replies = allComments.filter(c => c.parentId === comment.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle>{comment.userName}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(comment.timestamp).toLocaleString()}
              </p>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onEdit?.(comment.id);
                    onClose();
                  }}
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onDelete?.(comment.id);
                    onClose();
                  }}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rich HTML Content */}
          {comment.commentHtml ? (
            <>
              <style>{`
                .comment-content table,
                .reply-content table {
                  border-collapse: collapse;
                  width: 100%;
                  margin: 1em 0;
                }
                .comment-content table,
                .comment-content th,
                .comment-content td,
                .reply-content table,
                .reply-content th,
                .reply-content td {
                  border: 1px solid #d1d5db;
                }
                .comment-content th,
                .comment-content td,
                .reply-content th,
                .reply-content td {
                  padding: 8px 12px;
                  text-align: left;
                }
                .comment-content th,
                .reply-content th {
                  background-color: #f3f4f6;
                  font-weight: 600;
                }
              `}</style>
              <div
                className="comment-content prose prose-sm max-w-none text-foreground
                  prose-p:m-0 prose-p:mb-2
                  prose-h1:text-lg prose-h1:font-bold prose-h1:mb-2
                  prose-h2:text-base prose-h2:font-semibold prose-h2:mb-2
                  prose-strong:font-semibold
                  prose-em:italic
                  prose-u:underline
                  prose-img:max-w-full prose-img:h-auto prose-img:my-2
                "
                dangerouslySetInnerHTML={{ __html: comment.commentHtml }}
              />
            </>
          ) : (
            <p className="whitespace-pre-wrap text-foreground">{comment.comment}</p>
          )}

          {/* Images */}
          {comment.images && comment.images.length > 0 && (
            <div className="space-y-2">
              {comment.images.map((image) => (
                <img
                  key={image.id}
                  src={image.url}
                  alt={image.alt || "Comment image"}
                  className="max-w-full h-auto rounded border"
                />
              ))}
            </div>
          )}

          {/* User Info */}
          <div className="text-xs text-muted-foreground pt-4 border-t">
            <p>Posted by {comment.userEmail}</p>
          </div>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="pt-4 border-t space-y-3">
              <h4 className="font-semibold text-sm">Replies ({replies.length})</h4>
              {replies.map((reply) => (
                <div key={reply.id} className="bg-muted/30 rounded-lg p-3 ml-4 border-l-2 border-primary">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-sm">{reply.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(reply.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit?.(reply.id)}
                          title="Edit"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm("Delete this reply?")) {
                              onDelete?.(reply.id);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {reply.commentHtml ? (
                    <div
                      className="reply-content prose prose-sm max-w-none text-foreground text-xs
                        prose-p:m-0 prose-p:mb-1
                        prose-h1:text-sm prose-h1:font-bold prose-h1:mb-1
                        prose-h2:text-xs prose-h2:font-semibold prose-h2:mb-1
                        prose-strong:font-semibold
                        prose-em:italic
                        prose-u:underline
                      "
                      dangerouslySetInnerHTML={{ __html: reply.commentHtml }}
                    />
                  ) : (
                    <p className="text-xs whitespace-pre-wrap text-foreground">{reply.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">By {reply.userEmail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

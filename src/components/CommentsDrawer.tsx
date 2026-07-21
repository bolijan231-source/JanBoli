import React, { useState, useRef } from 'react';
import { X, Send, MessageCircle, Reply } from 'lucide-react';
import { Comment } from '../types';

interface CommentsDrawerProps {
  videoId: string;
  comments: Comment[];
  user: any;
  onAddComment: (text: string) => void;
  onClose: () => void;
  isLightMode?: boolean;
}

interface CommentItemProps {
  comment: Comment;
  user: any;
  isLightMode: boolean;
  formatDate: (isoStr: string) => string;
  onSwipeToReply: (comment: Comment) => void;
}

function CommentItem({ comment, user, isLightMode, formatDate, onSwipeToReply }: CommentItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isSwiping = useRef<boolean>(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only primary clicks
    startX.current = e.clientX;
    startY.current = e.clientY;
    isSwiping.current = false;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startX.current === null || startY.current === null) return;

    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;

    if (!isSwiping.current) {
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isSwiping.current = true;
      } else if (Math.abs(deltaY) > 8) {
        startX.current = null;
        startY.current = null;
        return;
      }
    }

    if (isSwiping.current) {
      e.preventDefault();
      if (deltaX > 0) {
        // Logarithmic friction dragging up to max 75px
        const limitedX = Math.min(deltaX * 0.6, 75);
        setTranslateX(limitedX);
      } else {
        setTranslateX(0);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (startX.current !== null) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    startX.current = null;
    startY.current = null;

    if (isSwiping.current) {
      isSwiping.current = false;
      if (translateX >= 45) {
        onSwipeToReply(comment);
        if (navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch (err) {}
        }
      }
    }
    setTranslateX(0);
  };

  const parseQuote = (commentText: string) => {
    const match = commentText.match(/^❝ @([^:]+): ([\s\S]+?) ❞\n([\s\S]*)$/);
    if (match) {
      return {
        isQuote: true,
        quotedUser: match[1],
        quotedText: match[2],
        mainText: match[3]
      };
    }
    return { isQuote: false, quotedUser: '', quotedText: '', mainText: commentText };
  };

  const parsed = parseQuote(comment.text);

  return (
    <div 
      className="relative overflow-hidden w-full select-none touch-none rounded-2xl"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Background swipe reply indicator */}
      <div 
        className="absolute inset-y-0 left-0 flex items-center pl-4 transition-all duration-150 pointer-events-none"
        style={{
          opacity: Math.min(translateX / 45, 1),
          transform: `scale(${translateX >= 45 ? 1.1 : 0.95})`,
        }}
      >
        <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-500 shadow-sm">
          <Reply size={15} />
        </div>
      </div>

      {/* Comment card foreground */}
      <div 
        className="flex gap-3 items-start p-1 transition-transform"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: translateX === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
        }}
      >
        <img
          src={comment.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'}
          alt={comment.userName}
          className={`w-8 h-8 rounded-full object-cover shrink-0 border ${isLightMode ? 'border-slate-100' : 'border-slate-800'}`}
          draggable={false}
        />
        <div className={`space-y-1 flex-1 p-2.5 rounded-xl border transition-all duration-300 ${
          isLightMode ? 'bg-slate-50 border-slate-100 text-slate-800 shadow-sm' : 'bg-slate-950/45 border-slate-800/40 text-slate-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
              @{comment.userPhone === user?.phone ? 'तपाईं' : comment.userName}
            </span>
            <span className="text-xxs text-slate-500">{formatDate(comment.createdAt)}</span>
          </div>

          {parsed.isQuote ? (
            <div className={`mb-1.5 p-2 rounded-lg border-l-2 text-[10px] text-left transition-colors ${
              isLightMode 
                ? 'border-blue-500 bg-slate-100/80 text-slate-600' 
                : 'border-blue-400 bg-slate-900/40 text-slate-400'
            }`}>
              <span className="text-[9px] font-bold block mb-0.5 text-blue-500">@{parsed.quotedUser}</span>
              <p className="line-clamp-2 italic leading-snug">{parsed.quotedText}</p>
            </div>
          ) : null}

          <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
            {parsed.isQuote ? parsed.mainText : comment.text}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CommentsDrawer({ comments, user, onAddComment, onClose, isLightMode = false }: CommentsDrawerProps) {
  const [text, setText] = useState('');
  const [quotedComment, setQuotedComment] = useState<Comment | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    let finalCommentText = text;
    if (quotedComment) {
      // Clean quoted comment text (prevent double nesting of quotes)
      const parseQuoteText = (commentText: string) => {
        const match = commentText.match(/^❝ @([^:]+): ([\s\S]+?) ❞\n([\s\S]*)$/);
        if (match) {
          return match[3];
        }
        return commentText;
      };
      const cleanQuotedText = parseQuoteText(quotedComment.text);
      finalCommentText = `❝ @${quotedComment.userName}: ${cleanQuotedText} ❞\n${text}`;
    }

    onAddComment(finalCommentText);
    setText('');
    setQuotedComment(null);
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('ne-NP', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'भर्खरै';
    }
  };

  return (
    <div id="comments_drawer_backdrop" className="absolute inset-0 z-40 bg-black/60 flex flex-col justify-end">
      {/* Click outside to close */}
      <div id="comments_dismiss" className="flex-grow" onClick={onClose}></div>
      
      {/* Drawer content */}
      <div id="comments_drawer" className={`rounded-t-3xl max-h-[70%] flex flex-col overflow-hidden animate-slide-up pb-safe border-t transition-all duration-300 ${
        isLightMode ? 'bg-white border-slate-200 shadow-2xl' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className={`p-4 flex items-center justify-between border-b ${
          isLightMode ? 'border-slate-100' : 'border-slate-800/80'
        }`}>
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-blue-500" />
            <h2 className={`text-sm font-semibold ${isLightMode ? 'text-slate-800' : 'text-white'}`}>टिप्पणीहरू ({comments.length})</h2>
          </div>
          <button id="close_comments" onClick={onClose} className={`p-1 rounded-full transition ${
            isLightMode ? 'text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200' : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}>
            <X size={16} />
          </button>
        </div>

        {/* Comments List */}
        <div id="comments_list" className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {comments.length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle size={32} className={`mx-auto mb-2 ${isLightMode ? 'text-slate-300' : 'text-slate-600'}`} />
              <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-500'}`}>यस भिडियोमा अझै कुनै टिप्पणी छैन।</p>
              <p className={`text-xxs mt-1 ${isLightMode ? 'text-slate-400' : 'text-slate-600'}`}>पहिलो टिप्पणी गर्ने व्यक्ति बन्नुहोस्!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem 
                key={comment.id}
                comment={comment}
                user={user}
                isLightMode={isLightMode}
                formatDate={formatDate}
                onSwipeToReply={setQuotedComment}
              />
            ))
          )}
        </div>

        {/* Quoted reply preview */}
        {quotedComment && (
          <div className={`px-4 py-2 flex items-center justify-between border-t text-xs transition-all duration-300 ${
            isLightMode ? 'bg-slate-50 border-slate-100' : 'bg-slate-950/80 border-slate-800'
          }`}>
            <div className="flex items-start gap-2 border-l-2 border-blue-500 pl-2.5 py-0.5 max-w-[85%]">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-blue-500">
                  @{quotedComment.userPhone === user?.phone ? 'तपाईं' : quotedComment.userName} लाई जवाफ दिँदै
                </span>
                <p className={`text-[10px] truncate ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {quotedComment.text.replace(/^❝ @([^:]+): ([\s\S]+?) ❞\n/, '')}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setQuotedComment(null)}
              className={`p-1 rounded-full transition ${
                isLightMode ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-200' : 'text-slate-500 hover:text-white hover:bg-slate-800'
              }`}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Input box */}
        <div className={`p-4 border-t transition-all duration-300 ${
          isLightMode ? 'border-slate-100 bg-white' : 'border-slate-800/80 bg-slate-900/90'
        }`}>
          {user ? (
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'}
                alt={user.name}
                className={`w-8 h-8 rounded-full object-cover border ${isLightMode ? 'border-slate-100' : 'border-slate-800'}`}
              />
              <div className="flex-1 relative">
                <input
                  id="comment_input_box"
                  type="text"
                  placeholder={quotedComment ? "जवाफ लेख्नुहोस्..." : "टिप्पणी लेख्नुहोस्..."}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className={`w-full border rounded-full py-2 pl-4 pr-10 text-xs focus:outline-none focus:border-red-600 transition-all duration-300 ${
                    isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400' : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                  }`}
                />
                <button
                  id="submit_comment_btn"
                  type="submit"
                  disabled={!text.trim()}
                  className={`absolute right-2 top-1.5 p-1 text-red-500 hover:text-red-400 disabled:text-slate-600 transition ${
                    isLightMode ? 'disabled:text-slate-300' : 'disabled:text-slate-600'
                  }`}
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          ) : (
            <div className={`text-center py-2 rounded-xl border ${
              isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800/50'
            }`}>
              <p className="text-slate-400 text-xxs">टिप्पणी गर्न कृपया पहिले लगइन गर्नुहोस्।</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export interface Comment {
  id: string;
  userPhone: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface Report {
  reporterPhone: string;
  reason: string;
  timestamp: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  province: string;
  district: string;
  municipality: string;
  exactLocation: string;
  category: string;
  reporterPhone: string;
  reporterName: string;
  reporterAvatar: string;
  reporterVerified: boolean;
  likes: string[]; // List of user phone numbers who liked
  comments: Comment[];
  savedBy: string[]; // List of user phone numbers who saved
  status: 'approved' | 'pending' | 'rejected';
  moderationReason?: string;
  confidenceScore: number;
  isBreaking: boolean;
  isSensitiveContent?: boolean;
  contentWarningText?: string;
  createdAt: string;
  reports?: Report[];
}

export interface User {
  phone: string;
  name: string;
  district: string;
  province: string;
  avatar: string;
  verified: boolean;
  followers: string[]; // List of user phones
  following: string[]; // List of user phones
  role: 'admin' | 'reporter' | 'user';
  banned: boolean;
}

export interface Notification {
  id: string;
  targetPhone: string; // 'all' or specific phone number
  type: 'like' | 'comment' | 'follow' | 'breaking' | 'admin';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

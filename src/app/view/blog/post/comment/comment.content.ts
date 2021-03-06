export class CommentContent {
  id: string;
  postId?: string;
  userName: string;
  createdAt?: number;
  commentMarkdown: string;
  commentImageSrcs: any;
  likes: Array<string>;
  ownerId: string;
  updatedFrom: any;
  constructor(
    id: string = '',
    postId: string = '',
    userName: string = '',
    createdAt: number = 0,
    commentMarkdown: string = '',
    commentImageSrcs: any = [],
    likes: Array<string> = [],
    ownerId: string = '',
    updatedFrom: any = {},
  ){
    this.id = id;
    this.postId = postId;
    this.userName = userName;
    this.createdAt = createdAt,
    this.commentMarkdown = commentMarkdown;
    this.commentImageSrcs = commentImageSrcs;
    this.likes = likes;
    this.ownerId = ownerId;
    this.updatedFrom = updatedFrom;
  }
}

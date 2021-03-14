import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Subscription, Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { CommentContent } from './comment.content';
import { BlogService } from 'src/app/services/blog.service';
import { FormHelper } from 'src/app/helper/form.helper';
import { DataTransferHelper } from 'src/app/helper/data-transfer.helper';
import { BlogContent } from '../../blog.content';
import { ProfileService } from 'src/app/services/profile.service';
import { ToastHelper } from 'src/app/helper/toast.helper';
import Swal from 'sweetalert2';
import { RouterHelper } from 'src/app/helper/router.helper';
import { AuthService } from 'src/app/services/auth.service';
import { CollectionSelect } from 'src/app/services/abstract/common.service';
import * as firebase from 'firebase/app';
const FieldPath = firebase.default.firestore.FieldPath;

@Component({
  selector: 'app-comment',
  templateUrl: './comment.component.html',
  styleUrls: ['../../blog.component.scss', './comment.component.scss']
})
export class CommentComponent implements OnInit, OnDestroy {
  creatingCommentParentId?: string;
  creatingCommentForm: any;
  blogId?: string;
  isEditingCommentIds?: Array<string>;

  commentContents?: CommentContent[];
  commentContentsSub?: Subscription;
  commentContentsForm: any;
  commentContentsObserver?: Observable<CommentContent[]>;

  paramSub: Subscription;
  params: any;

  isPage = true;
  isCreatingComment = false;
  isShowingComment = false;
  hasNullCommentContentError = false;

  pageSize = 0;
  pageIndex = 0;
  postCreatedAtList: Array<number> = [];

  constructor(
    public profileService: ProfileService,
    private toastHelper: ToastHelper,
    public routerHelper: RouterHelper,
    private route: ActivatedRoute,
    private blogService: BlogService,
    public formHelper: FormHelper,
    public dataTransferHelper: DataTransferHelper,
    private authService: AuthService,
  ) {
    this.paramSub = this.route.params.subscribe(params => {
      this.params = params;
    });
  }

  @Input() isEditingPost?: boolean;
  @Input()
  get blogContent(): BlogContent|undefined { return this._blogContent; }
  set blogContent(blogContent: BlogContent|undefined) {
    this.isEditingCommentIds = [];
    this.isPage = true;
    if (!blogContent){
      this.isPage = false;
      return;
    }
    this._blogContent = blogContent;
    this.blogId = blogContent.id;

    this.commentContentsObserver = this.blogService.select(
      `blogs/${this.blogId}/comments`,
      {
        where: [{
          fieldPath: new FieldPath('postId'),
          operator: '==',
          value: this.params.postId,
        }]
      } as CollectionSelect
    );

    this.commentContentsSub = this.commentContentsObserver?.subscribe(commentContents => {
      this.commentContents = commentContents;
      // this.commentContents.sort((categoryA: CommentContent, categoryB: CommentContent) =>
      //   categoryA.commentNumber - categoryB.commentNumber);

      this.commentContents.sort(this.dataTransferHelper.compareByOrderRecursively);
      this.commentContentsForm =
        this.formHelper.buildFormRecursively({commentContents: this.commentContents});
      this.isShowingComment = true;
    });
  }
  // tslint:disable-next-line: variable-name
  private _blogContent?: BlogContent;

  isOwner(commentOwnerId: string): boolean {
    if (!this.authService.isSignedIn()){
      return false;
    }

    return commentOwnerId === this.authService.getCurrentUser()?.uid;
  }

  getCommentMarkdownLines(commentContent: any): number{
    return commentContent?.controls?.commentMarkdown?.value?.match(/\n/g)?.length + 2 || 3;
  }

  clickCommnetNew(parentId?: string): void {
    this.isCreatingComment = true;
    this.creatingCommentParentId = parentId;
    this.creatingCommentForm = this.formHelper.buildFormRecursively(new CommentContent());
    this.routerHelper.scrollToIdElement('comment-new');
  }

  clickCommentNewCancel(): void {
    this.isCreatingComment = false;
    delete this.creatingCommentParentId;
    delete this.creatingCommentForm;
  }

  clickCommentNewUpdate(): void {
    const newComment = this.creatingCommentForm.value;
    newComment.postId = this.params.postId;
    newComment.userName = this.authService.getCurrentUser()?.userName;
    const parentComment: CommentContent|undefined = this.commentContents?.find(
      (commentContent) => commentContent.id === this.creatingCommentParentId);

    const createdAt = Number(new Date());
    newComment.createdAt = createdAt;
    newComment.order = [createdAt];

    if (parentComment) {
      newComment.parentId = parentComment.id;
      newComment.deepCount = parentComment?.deepCount || 0 + 1;
      newComment.order = [...parentComment.order, createdAt];
    }

    this.creatingCommentForm = this.formHelper.buildFormRecursively(newComment);
    this.blogService
    .create(`blogs/${this.blogContent?.id}/comments`, newComment)
    .then(() => {
      this.toastHelper.showSuccess('Comment Update', 'Success!');
      this.isCreatingComment = false;
      delete this.creatingCommentParentId;
      delete this.creatingCommentForm;
    })
    .catch(e => {
      this.toastHelper.showWarning('Comment Update Failed.', e);
    });
  }

  clickCommentEdit(commentId: string): void {
    this.isEditingCommentIds?.push(commentId);
  }

  clickCommentEditCancel(commentId: string): void {
    this.isEditingCommentIds = this.isEditingCommentIds || []
    .filter((isEditingCommentId) => isEditingCommentId !== commentId);
  }

  handleClickEditCommentUpdate(commentForm: any): void {
    if (this.isEditingCommentIds?.includes(commentForm.value.id)){
      this.hasNullCommentContentError = false;
      if (!commentForm.value.commentMarkdown){
        this.hasNullCommentContentError = true;
        return;
      }

      this.blogService
      .update(
        `blogs/${this.blogContent?.id}/comments/${commentForm.value.id}`,
        commentForm.value
      )
      .then(() => {
        this.toastHelper.showSuccess('Comment Update', 'Success!');
        this.isEditingCommentIds = this.isEditingCommentIds || []
        .filter((isEditingCommentId) => isEditingCommentId !== commentForm.value.id);
      })
      .catch(e => {
        this.toastHelper.showWarning('Comment Update Failed.', e);
      });
    }
  }

  handleClickEditCommentDelete(commentContent: any): void {
    this.toastHelper.askYesNo('Remove Profile Category', 'Are you sure?').then((result) => {
      if (result.value && commentContent.value.id) {
        this.blogService.delete(
          `blogs/${this.blogContent?.id}/comments/${commentContent.value.id}`,
          {}
        )
        .then(() => {
          this.toastHelper.showSuccess('Comment Delete', 'OK');
        })
        .catch(e => {
          this.toastHelper.showWarning('Comment Delete Failed.', e);
        });
      }
      else if (result.dismiss === Swal.DismissReason.cancel) {
      }
    });
  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {
    this.commentContentsSub?.unsubscribe();
    this.paramSub?.unsubscribe();
  }
}

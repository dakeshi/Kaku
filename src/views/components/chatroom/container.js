import React from 'react';
import ClassNames from 'classnames';
import ReactFireMixin from 'reactfire';
import L10nSpan from '../shared/l10n-span';
import CommentForm from './comment/comment-form';
import CommentList from './comment/comment-list';
import Constants from '../../../modules/Constants';
import Firebase from '../../../modules/wrapper/Firebase';

let ChatroomContainer = React.createClass({
  mixins: [ReactFireMixin],

  getInitialState: function() {
    return {
      shown: false,
      isRoomConnected: false,
      roomName: '',
      onlineUsers: [],
      userInfo: {},
      comments: []
    };
  },

  componentWillMount: function() {
    Firebase.on('meatadata-updated', (metadata) => {
      this.setState({
        roomName: metadata.roomName
      });
    });

    // Great, if the room is opened
    Firebase.on('setup', (userInfo) => {
      // we can join to specifc room
      let commentsRef = Firebase.joinCommentsRoom();
      this.bindAsArray(commentsRef, 'comments');

      let onlineUsersRef = Firebase.joinOnlineUsersRoom();
      this.bindAsArray(onlineUsersRef, 'onlineUsers');

      let currentUserRef = onlineUsersRef.push();
      // http://stackoverflow.com/questions/15982215/firebase-count-online-users
      //
      // This is special, we need to join to this special room to make sure
      // we can reflect the count of online users
      let connectedRef = Firebase.joinConnectedRoom();
      connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === true) {
          // Keep current user's information to `onlineUsersRef`
          currentUserRef.set(userInfo);
          currentUserRef.onDisconnect().remove();
        }
      });

      // keep current users information
      this.setState({
        isRoomConnected: true,
        userInfo: userInfo
      });
    });

    Firebase.on('room-left', (roomName, ref) => {
      if ('comments' === roomName) {
        this.unbind('comments');
      }
      else if ('onlineUsers' === roomName) {
        this.unbind('onlineUsers');
      }
    });

    Firebase.on('room-left-all', () => {
      // do a final cleanup
      this.setState({
        userInfo: {},
        roomName: '',
        isRoomConnected: false
      });
    });
  },

  _onHeaderClick: function() {
    this.setState({
      shown: !this.state.shown
    });
  },

  _onCommentSubmit: function(comment) {
    let userName = this.state.userInfo.userName;
    this.firebaseRefs.comments.push({
      userName: userName,
      comment: comment
    });
  },

  _getOnlineUsersCount: function() {
    let onlineUsers = this.state.onlineUsers;
    // unbind() will cause the value to `undefined` ...
    let onlineUsersCount = onlineUsers && onlineUsers.length;
    if (this.state.isRoomConnected) {
      return onlineUsersCount;
    }
    else {
      return 0;
    }
  },

  render: function() {
    /* jshint ignore:start */
    let headerSpan;
    let roomName = this.state.roomName;
    let comments = this.state.comments;
    let shown = this.state.shown;
    let isRoomConnected = this.state.isRoomConnected;
    let onlineUsersCount = this._getOnlineUsersCount();

    if (roomName) {
      headerSpan = <span>{roomName}</span>;
    } else {
      headerSpan = <L10nSpan l10nId="chatroom_header"/>;
    }

    let chatroomClass = ClassNames({
      'chatroom': true,
      'shown': shown,
      'online': isRoomConnected,
      'offline': !isRoomConnected,
      'error': false
    });

    return (
      <div className={chatroomClass}>
        <h1 className="header" onClick={this._onHeaderClick}>
          <i className="fa fa-fw fa-commenting-o"></i>
          {headerSpan} - ({onlineUsersCount})
        </h1>
        <div className="comment-container">
          <CommentList comments={comments}></CommentList>
          <CommentForm
            onSubmit={this._onCommentSubmit}
            shown={shown}
            connected={isRoomConnected}></CommentForm>
        </div>
      </div>
    );
    /* jshint ignore:end */
  }
});

module.exports = ChatroomContainer;

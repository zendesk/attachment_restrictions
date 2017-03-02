(function() {

  return {

    acceptedExtensions: [],

    events: {
      'app.activated': 'initialize',
      'getAudits.done': 'findAttachments',
      'getAudits.fail': 'handleFail',
      'click .toggle_attachments': 'toggleAttachmentList'
    },

    requests: {
      // Attachments come from our audits API
      'getAudits': function(ticketId) {
        return {
          url:  helpers.fmt('/api/v2/tickets/%@/audits.json', ticketId),
          type: 'GET',
          dataType : 'json'
        };
      }
    },

    initialize: function() {
      var whitelistStr = this.setting('whitelist') || '';
      if (whitelistStr === '') {
        services.notify(this.I18n.t('global.alert.empty_whitelist'), 'alert');
      }
      this.acceptedExtensions = whitelistStr.replace(/(\r\n|\n|\r|\s)/gm,'')
                                            .replace(/(,+$|^,+)/gm, '')
                                            .split(',');
      this.ajax('getAudits', this.ticket().id());
      this.switchTo('loading_screen');
    },

    // Go through all the audits and find attachments
    findAttachments: function(audits) {
      var attachments = [];

      _.each(audits.audits, function(audit){
        var commentEvents = _.filter(audit.events, function(auditEvent){
          return auditEvent.type == 'Comment';
        });
        _.each(commentEvents, function(commentEvent){
          attachments = _.union(attachments, commentEvent.attachments);
        });
      });

      this.processAttachments(attachments);
    },

    // Work out if the attachments are secure or not
    processAttachments: function(attachments) {
      var invalidAttachments = _.filter(attachments, function(attachment){
        var extension = this._extractExtension(attachment.file_name);
        return _.indexOf(this.acceptedExtensions, extension) < 0;
      }.bind(this));

      this.isSecure = _.isEmpty(invalidAttachments);

      if (this.isSecure) {
        this.switchTo('secure');
      } else {
        this.switchTo('unsecure', { attachments: invalidAttachments });
        this.isHidden = true;
      }
    },

    _extractExtension: function(file_name) {
      return file_name.substring( file_name.lastIndexOf('.') + 1 );
    },

    handleFail: function() {
      this.switchTo('error', {
        message: this.I18n.t('global.error.general')
      });
    },

    toggleAttachmentList: function(event) {
      event.preventDefault();
      var $icon           = this.$(event.currentTarget).children('i').eq(0),
          $attachmentList = this.$('.attachment_list');

      if (this.isHidden) {
        $icon.removeClass('icon-chevron-down')
             .addClass('icon-chevron-up');
        $attachmentList.removeClass('hide');
      } else {
        $icon.removeClass('icon-chevron-up')
             .addClass('icon-chevron-down');
        $attachmentList.addClass('hide');
      }
      this.isHidden = !this.isHidden;
    }
  };

}());

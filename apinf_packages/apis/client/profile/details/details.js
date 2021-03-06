/* Copyright 2017 Apinf Oy
This file is covered by the EUPL license.
You may obtain a copy of the licence at
https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

// Meteor packages imports
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

// Npm packages imports
import Clipboard from 'clipboard';

// Collection imports
import ApiKeys from '/apinf_packages/api_keys/collection';
import Proxies from '/apinf_packages/proxies/collection';

Template.apiDetails.onCreated(function () {
  const instance = this;

  instance.autorun(() => {
    // Get Logo ID of current API using reactive way
    const apiLogoFileId = Template.currentData().api.apiLogoFileId;

    if (apiLogoFileId) {
      // Subscribe to current API logo
      instance.subscribe('currentApiLogo', apiLogoFileId);
    }
  });
});

Template.apiDetails.onRendered(() => {
  // Initialize Clipboard copy buttons
  const copyApiUrl = new Clipboard('#copyApiUrl');
  const copyProxyUrl = new Clipboard('#copyProxyUrl');
  const copyExampleOne = new Clipboard('#copyExampleOne');
  const copyExampleTwo = new Clipboard('#copyExampleTwo');

  // Tooltip position for copyApiUrl
  $('#copyApiUrl').tooltip({
    trigger: 'click',
    placement: 'bottom',
  });

  // Tooltip position for copyProxyUrl
  $('#copyProxyUrl').tooltip({
    trigger: 'click',
    placement: 'bottom',
  });

  // Tooltip position for copyExampleOne
  $('#copyExampleOne').tooltip({
    trigger: 'click',
    placement: 'bottom',
  });

  // Tooltip position for copyExampleTwo
  $('#copyExampleTwo').tooltip({
    trigger: 'click',
    placement: 'bottom',
  });

  // Tell the user when copying API URL is successful
  copyApiUrl.on('success', () => {
    $('#copyApiUrl').tooltip('hide')
      .attr('data-original-title', 'Copied!')
      .tooltip('show');
  });

  // Tell the user when copying Proxy URL is successful
  copyProxyUrl.on('success', () => {
    $('#copyProxyUrl').tooltip('hide')
      .attr('data-original-title', 'Copied!')
      .tooltip('show');
  });

  // Tell the user when copying Proxy URL is successful
  copyExampleOne.on('success', () => {
    $('#copyExampleOne').tooltip('hide')
      .attr('data-original-title', 'Copied!')
      .tooltip('show');
  });

  // Tell the user when copying Proxy URL is successful
  copyExampleTwo.on('success', () => {
    $('#copyExampleTwo').tooltip('hide')
      .attr('data-original-title', 'Copied!')
      .tooltip('show');
  });
});

Template.apiDetails.helpers({
  proxyUrl () {
    // Get reference to template instance
    const instance = Template.instance();

    // Get proxyBackend from template data
    const proxyBackend = instance.data.proxyBackend;

    // placeholder for output URL
    let proxyUrl;

    if (proxyBackend && proxyBackend.type === 'apiUmbrella') {
      // Get the proxy settings
      const proxy = Proxies.findOne(proxyBackend.proxyId);
      // Get Proxy host
      const host = proxy.apiUmbrella.url;

      // Get proxy frontend prefix
      let frontendPrefix = '';

      // It can be moment when proxyBackend exists but url_matches isn't
      if (proxyBackend.apiUmbrella.url_matches) {
        frontendPrefix = proxyBackend.apiUmbrella.url_matches[0].frontend_prefix;
      }

      // Construct the URL from host and base path
      proxyUrl = host + frontendPrefix;
    }
    return proxyUrl;
  },
  apiKey () {
    // Placeholder for API key
    let apiKey;

    // Get current user
    const currentUserId = Meteor.userId();

    // Get proxyId to template data
    const proxyId = Template.currentData().proxyBackend.proxyId;

    // Make sure user exists and has API key
    if (currentUserId && proxyId) {
      // Get API Key document
      const userApiKey = ApiKeys.findOne({ userId: currentUserId, proxyId });

      // Check that Umbrella API key exists
      if (userApiKey && userApiKey.apiUmbrella) {
        // Get the API Key, from API key document
        apiKey = userApiKey.apiUmbrella.apiKey;
      }
    }

    return apiKey;
  },
  // Check disable API key setting
  disableApiKey () {
    // Get reference to disable API key setting
    const disableApiKey = Template.currentData().proxyBackend.apiUmbrella.settings.disable_api_key;

    return disableApiKey;
  },
  // User has got an api key
  hasApiKey () {
    // Placeholder for API key
    let apiKey;

    // Get current user
    const currentUserId = Meteor.userId();

    // Get proxyId to template data
    const proxyId = Template.currentData().proxyBackend.proxyId;

    // Make sure user exists and has API key
    if (currentUserId && proxyId) {
      // Get API key by userId & proxyId
      apiKey = ApiKeys.findOne({ userId: currentUserId, proxyId });
    }
    // Return apiKey
    return apiKey;
  },
  displayLinkBlock () {
    const api = this.api;
    const apiDoc = this.apiDoc;

    // Display block if a user is manager of current API or URL is set
    return api.currentUserCanManage() || (apiDoc && apiDoc.otherUrl);
  },
  displayViewBlock () {
    const api = this.api;
    const instance = Template.instance();

    // Display block if a user is manager of current API or swagger documentation is available
    return api.currentUserCanManage() || instance.documentationExists.get();
  },
});

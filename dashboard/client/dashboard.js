import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Router } from 'meteor/iron:router';
import { Roles } from 'meteor/alanning:roles';

import { ProxyBackends } from '/proxy_backends/collection';

import moment from 'moment';
import _ from 'lodash';

Template.dashboard.onCreated(function () {
  // Get reference to template instance
  const instance = this;

  // Subscribe to proxyApis publicaton
  instance.subscribe('proxyApis');

  // Keeps ES data for charts
  instance.chartData = new ReactiveVar();

  // Keeps chart data loading state
  instance.chartDataLoadingState = new ReactiveVar(false);

  // Keeps date format for moment.js
  instance.dateFormatMoment = 'DD MMM YYYY';

  // Init default time frame
  instance.analyticsTimeframeStart = new ReactiveVar(moment().subtract(1, 'month'));
  instance.analyticsTimeframeEnd = new ReactiveVar(moment());

  // Get current user Id
  const userId = Meteor.userId();

  if (Roles.userIsInRole(userId, ['admin'])) {
    // Subscribe to publication
    instance.subscribe('allApiBackends');
  } else {
    // Subscribe to publication
    instance.subscribe('myManagedApis');
  }

  instance.checkElasticsearch = function () {
    return new Promise((resolve, reject) => {
      Meteor.call('elasticsearchIsDefined', (err, res) => {
        if (err) reject(err);

        resolve(res);
      });
    });
  };

  instance.getChartData = function (params) {
    return new Promise((resolve, reject) => {
      Meteor.call('getElasticSearchData', params, (err, res) => {
        if (err) reject(err);
        resolve(res.hits.hits);
      });
    });
  };

  instance.getElasticSearchQuery = function () {
    // Placeholder for prefixes query
    let prefixesQuery = [];
    // Get APIs managed by user
    const proxyBackends = ProxyBackends.find().fetch();

    // Get endpoint data from each proxybackend
    const apis = _.map(proxyBackends, proxyBackend => {
      // Get apiUmbrella object
      const api = proxyBackend.apiUmbrella;
      // Attach _id to API
      api._id = proxyBackend.apiId;
      return api;
    });

    // If there are some APIs then setup query
    if (apis.length > 0) {
      prefixesQuery = _.map(apis, (api) => {
        return {
          wildcard: {
            request_path: {
              // Add '*' to partially match the url
              value: `${api.url_matches[0].frontend_prefix}*`,
            },
          },
        };
      });
    }

    // Check if user has an admin role
    if (Roles.userIsInRole(userId, ['admin'])) {
      // Add query for API Umbrella analytics data
      prefixesQuery.push({
        wildcard: {
          request_path: {
            // Add '*' to partially match the url
            value: '*/api-umbrella/*',
          },
        },
      });
    }

    // Construct parameters for elasticsearch
    const params = {
      size: 50000,
      body: {
        query: {
          filtered: {
            query: {
              bool: {
                should: [
                  prefixesQuery,
                ],
              },
            },
            filter: {
              range: {
                request_at: { },
              },
            },
          },
        },
        sort: [
          { request_at: { order: 'desc' } },
        ],
        fields: [
          'request_at',
          'response_status',
          'response_time',
          'request_ip_country',
          'request_ip',
          'request_path',
          'user_id',
        ],
      },
    };

    // ******* Filtering by date *******
    const analyticsTimeframeStart = instance.analyticsTimeframeStart.get();
    const analyticsTimeframeEnd = instance.analyticsTimeframeEnd.get();

    // Check if timeframe values are set
    if (analyticsTimeframeStart && analyticsTimeframeEnd) {
      // Update elasticsearch query with filter data (in Unix format)
      params.body.query.filtered.filter.range.request_at.gte = analyticsTimeframeStart.valueOf();

      params.body.query.filtered.filter.range.request_at.lte = analyticsTimeframeEnd.valueOf();
    }
    // ******* End filtering by date *******

    return params;
  };

  instance.autorun(() => {
    if (instance.subscriptionsReady()) {
      // Get elasticsearch query
      const params = instance.getElasticSearchQuery();

      // Set loader
      instance.chartDataLoadingState.set(true);

      // Check if proxyBackendsCount
      const proxyBackendsCount = ProxyBackends.find().count();

      if (proxyBackendsCount > 0) {
        // Make a call
        instance.checkElasticsearch()
          .then((elasticsearchIsDefined) => {
            if (elasticsearchIsDefined) {
              instance.getChartData(params)
                .then((chartData) => {
                  // Update reactive variable
                  instance.chartData.set(chartData);
                  instance.chartDataLoadingState.set(false);
                })
                .catch(err => console.error(err));
            } else {
              console.error('Elasticsearch is not defined!');

              Router.go('/catalogue');
            }
          })
          .catch(err => console.error(err));
      }
    }
  });
});

Template.dashboard.helpers({
  chartData () {
    const instance = Template.instance();

    return instance.chartData.get();
  },
  loadingState () {
    const instance = Template.instance();

    return instance.chartDataLoadingState.get();
  },
  proxyBackendsAdded () {
    const instance = Template.instance();

    // Count the number of proxy backends
    const proxyBackendsCount = ProxyBackends.find().count();

    // return true if one or more proxy backends have been added
    return (proxyBackendsCount > 0);
  },
});

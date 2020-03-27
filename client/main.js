import Vue from 'vue';
import Router from 'vue-router';
import infiniteScroll from 'vue-infinite-scroll';
import vueSelect from 'vue-select';
import vueModal from 'vue-js-modal';
import vueSplit from 'vue-split-panel';
import qs from 'friendly-querystring';
import moment from 'moment';
import promiseFinally from 'promise.prototype.finally';

import copyButton from './components/copy.vue';

import snapscroll from './directives/snapscroll';

import App from './App.vue';
import Namespace from './routes/namespace/index.vue';
import NamespaceList from './routes/namespace-list.vue';
import NamespaceSettings from './routes/namespace/namespace-settings.vue';
import Help from './routes/help/index.vue';
import History from './routes/workflow/history.vue';
import Query from './routes/workflow/query.vue';
import Root from './routes/index.vue';
import StackTrace from './routes/workflow/stack-trace.vue';
import TaskList from './routes/namespace/task-list.vue';
import WorkflowList from './routes/namespace/workflow-list.vue';
import WorkflowSummary from './routes/workflow/summary.vue';
import WorkflowTabs from './routes/workflow/index.vue';

import { http, injectMomentDurationFormat, jsonTryParse } from '~helpers';

const routeOpts = {
  mode: 'history',
  routes: [
    {
      path: '/',
      redirect: '/namespaces',
      component: Root,
      children: [
        {
          name: 'namespace-list',
          path: '/namespaces',
          components: {
            'namespace-list': NamespaceList,
          },
        },
        {
          name: 'help',
          path: '/help',
          components: {
            help: Help,
          },
        },
      ],
    },
    {
      name: 'namespace',
      path: '/namespaces/:namespace',
      component: Namespace,
      props: ({ params }) => ({
        namespace: params.namespace,
      }),
      children: [
        {
          name: 'workflow-list',
          path: '/namespaces/:namespace/workflows',
          components: {
            'workflow-list': WorkflowList,
          },
        },
        {
          name: 'namespace-settings',
          path: '/namespaces/:namespace/settings',
          components: {
            'namespace-settings': NamespaceSettings,
          },
        },
      ],
    },
    {
      name: 'workflow',
      path: '/namespaces/:namespace/workflows/:workflowId/:runId',
      component: WorkflowTabs,
      props: ({ params }) => ({
        namespace: params.namespace,
        runId: params.runId,
        workflowId: params.workflowId,
      }),
      children: [
        {
          name: 'workflow/summary',
          path: '/namespaces/:namespace/workflows/:workflowId/:runId/summary',
          components: {
            summary: WorkflowSummary,
          },
          props: {
            summary: ({ params }) => ({
              runId: params.runId,
              workflowId: params.workflowId,
            }),
          },
        },
        {
          name: 'workflow/history',
          path: '/namespaces/:namespace/workflows/:workflowId/:runId/history',
          components: {
            history: History,
          },
          props: {
            history: ({ params, query }) => ({
              namespace: params.namespace,
              eventId: Number(query.eventId) || undefined,
              format: query.format || 'grid',
              runId: params.runId,
              showGraph: query.showGraph === true,
              workflowId: params.workflowId,
            }),
          },
        },
        {
          name: 'workflow/stack-trace',
          path: '/namespaces/:namespace/workflows/:workflowId/:runId/stack-trace',
          components: {
            stacktrace: StackTrace,
          },
        },
        {
          name: 'workflow/query',
          path: '/namespaces/:namespace/workflows/:workflowId/:runId/query',
          components: {
            query: Query,
          },
        },
      ],
    },
    {
      name: 'task-list',
      path: '/namespaces/:namespace/task-lists/:taskList',
      component: TaskList,
    },

    // redirects

    {
      name: 'namespaces-redirect',
      path: '/namespace/*',
      redirect: '/namespaces/*',
    },
    {
      name: 'namespace-config-redirect',
      path: '/namespaces/:namespace/config',
      redirect: '/namespaces/:namespace/settings',
    },
    {
      path: '/namespaces/:namespace/history',
      redirect: ({ params, query }) => {
        if (!query.runId || !query.workflowId) {
          return {
            name: 'workflow-list',
            params,
          };
        }

        const { runId, workflowId, ...queryWhitelist } = query;

        const newParams = {
          runId,
          workflowId,
          namespace: params.namespace,
        };

        return {
          name: 'workflow/history',
          params: newParams,
          query: queryWhitelist,
        };
      },
    },
  ],
  parseQuery: qs.parse.bind(qs),
  stringifyQuery: query => {
    const q = qs.stringify(query);

    return q ? `?${q}` : '';
  },
};

const router = new Router(routeOpts);

Object.getPrototypeOf(router).replaceQueryParam = function replaceQueryParam(
  prop,
  val
) {
  const newQuery = {
    ...this.currentRoute.query,
    [prop]: val,
  };

  if (!newQuery[prop]) {
    delete newQuery[prop];
  }

  this.replace({ query: newQuery });
};

injectMomentDurationFormat();

JSON.tryParse = jsonTryParse;

promiseFinally.shim();

Vue.mixin({
  created() {
    this.$moment = moment;

    if (typeof Scenario === 'undefined') {
      this.$http = http.global;
    } else if (this.$parent && this.$parent.$http) {
      this.$http = this.$parent.$http;
    }
  },
});

Vue.use(Router);
Vue.use(infiniteScroll);
Vue.use(vueModal, {
  dialog: true,
  dynamic: true,
});
Vue.use(vueSplit);
Vue.component('v-select', vueSelect);
Vue.component('copy', copyButton);
Vue.directive('snapscroll', snapscroll);
Vue.config.ignoredElements = ['loader'];

if (typeof mocha === 'undefined') {
  if (!document.querySelector('main')) {
    document.body.appendChild(document.createElement('main'));
  }

  // eslint-disable-next-line no-new
  new Vue({
    el: 'main',
    router,
    template: '<App/>',
    components: { App },
  });

  if (module.hot) {
    module.hot.addStatusHandler(status => {
      if (status === 'apply') {
        document
          .querySelectorAll('link[href][rel=stylesheet]')
          .forEach(link => {
            const nextStyleHref = link.href.replace(
              /(\?\d+)?$/,
              `?${Date.now()}`
            );

            // eslint-disable-next-line no-param-reassign
            link.href = nextStyleHref;
          });
      }
    });
  }
}

export default {
  App,
  routeOpts,
};

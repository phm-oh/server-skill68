import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: (to) => {
      const authStore = useAuthStore();
      if (!authStore.isAuthenticated) return '/login';
      if (authStore.isAdmin) return '/admin';
      if (authStore.isEvaluator) return '/evaluator';
      if (authStore.isEvaluatee) return '/evaluatee';
      return '/login';
    }
  },

  // Admin Routes
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('@/views/hr/HRDashboard.vue'),
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/admin/users',
    name: 'UsersManage',
    component: () => import('@/views/hr/UsersManage.vue'),
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/admin/topics',
    name: 'TopicsManage',
    component: () => import('@/views/hr/TopicsManage.vue'),
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/admin/indicators',
    name: 'IndicatorsManage',
    component: () => import('@/views/hr/IndicatorsManage.vue'),
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/admin/assignments',
    name: 'AssignmentsManage',
    component: () => import('@/views/hr/AssignmentsManage.vue'),
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/admin/reports',
    name: 'ReportsView',
    component: () => import('@/views/hr/ReportsView.vue'),
    meta: { requiresAuth: true, role: 'admin' }
  },

  // Evaluatee Routes
  {
    path: '/evaluatee',
    name: 'EvaluateeDashboard',
    component: () => import('@/views/evaluatee/EvaluateeDashboard.vue'),
    meta: { requiresAuth: true, role: 'evaluatee' }
  },
  {
    path: '/evaluatee/evaluation',
    name: 'SelfEvaluation',
    component: () => import('@/views/evaluatee/SelfEvaluation.vue'),
    meta: { requiresAuth: true, role: 'evaluatee' }
  },
  {
    path: '/evaluatee/evidence',
    name: 'EvidenceManage',
    component: () => import('@/views/evaluatee/EvidenceManage.vue'),
    meta: { requiresAuth: true, role: 'evaluatee' }
  },
  {
    path: '/evaluatee/report',
    name: 'MyReport',
    component: () => import('@/views/evaluatee/MyReport.vue'),
    meta: { requiresAuth: true, role: 'evaluatee' }
  },

  // Evaluator Routes
  {
    path: '/evaluator',
    name: 'EvaluatorDashboard',
    component: () => import('@/views/committee/CommitteeDashboard.vue'),
    meta: { requiresAuth: true, role: 'evaluator' }
  },
  {
    path: '/evaluator/assignments',
    name: 'AssignmentsList',
    component: () => import('@/views/committee/AssignmentsList.vue'),
    meta: { requiresAuth: true, role: 'evaluator' }
  },
  {
    path: '/evaluator/review/:evaluateeId/:assignmentId',
    name: 'EvaluationReview',
    component: () => import('@/views/committee/EvaluationReview.vue'),
    meta: { requiresAuth: true, role: 'evaluator' }
  },
  {
    path: '/evaluator/approval',
    name: 'ApprovalPage',
    component: () => import('@/views/committee/ApprovalPage.vue'),
    meta: { requiresAuth: true, role: 'evaluator' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation Guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.meta.requiresAuth !== false;

  // Check authentication
  if (requiresAuth && !authStore.isAuthenticated) {
    return next('/login');
  }

  // If authenticated but user data not loaded, fetch it
  if (requiresAuth && authStore.isAuthenticated && !authStore.user) {
    try {
      await authStore.fetchCurrentUser();
    } catch (error) {
      console.error('[Router] Failed to fetch user:', error);
      return next('/login');
    }
  }

  // Check role permission
  if (to.meta.role && authStore.user) {
    if (authStore.user.role !== to.meta.role) {
      console.log('[Router] Role mismatch - User:', authStore.user.role, 'Required:', to.meta.role);
      const redirectPath = authStore.isAdmin ? '/admin' :
                          authStore.isEvaluator ? '/evaluator' : '/evaluatee';
      console.log('[Router] Redirecting to:', redirectPath);
      return next(redirectPath);
    }
  }

  next();
});

export default router;

import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/game' },
  { path: '/login', component: () => import('../views/LoginView.vue') },
  { path: '/register', component: () => import('../views/RegisterView.vue') },
  { path: '/game', component: () => import('../views/GameView.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})

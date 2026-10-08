import { useState, useEffect } from 'react'

export function isAdminAccount(userOrEmail) {
  return Boolean(userOrEmail && typeof userOrEmail === 'object' && userOrEmail.isAdmin === true)
}

const ADMIN_PERMS = {
  exercises: true,
  favoritesAdd: true,
  favoritesCalendar: true,
  nutrition: true,
  nutritionDiscount: true,
  ai: true,
  shopDiscount: 5
}

// Permisos por plan
export const PLAN_PERMS = {
  free: {
    exercises: true,
    favoritesAdd: true,
    favoritesCalendar: false,
    nutrition: false,
    nutritionDiscount: false,
    ai: false,
    shopDiscount: 0
  },
  pro: {
    exercises: true,
    favoritesAdd: true,
    favoritesCalendar: true,
    nutrition: false,          // se compra aparte, con descuento
    nutritionDiscount: true,
    ai: false,
    shopDiscount: 0
  },
  elite: {
    exercises: true,
    favoritesAdd: true,
    favoritesCalendar: true,
    nutrition: true,
    nutritionDiscount: false, // ya incluida, sin coste
    ai: true,
    shopDiscount: 5 // 5%
  }
}

// Guarda el plan pendiente (antes de login) en sessionStorage
const PENDING_KEY = 'gympower_pending_plan'
const USER_PLAN_PREFIX = 'gympower_plan_'
const NUTRITION_PREFIX = 'gympower_nutrition_'

export const NUTRITION_PRICE = 4.99
export const NUTRITION_PRO_PRICE = 2.99

export function getPendingPlan() {
  return sessionStorage.getItem(PENDING_KEY)
}

export function setPendingPlan(planId) {
  sessionStorage.setItem(PENDING_KEY, planId)
}

export function clearPendingPlan() {
  sessionStorage.removeItem(PENDING_KEY)
}

export function getUserPlan(uid) {
  return localStorage.getItem(USER_PLAN_PREFIX + uid) || null
}

export function setUserPlan(uid, planId) {
  localStorage.setItem(USER_PLAN_PREFIX + uid, planId)
}

export function getNutritionPurchased(uid) {
  return localStorage.getItem(NUTRITION_PREFIX + uid) === '1'
}

export function setNutritionPurchased(uid, value = true) {
  if (value) localStorage.setItem(NUTRITION_PREFIX + uid, '1')
  else localStorage.removeItem(NUTRITION_PREFIX + uid)
}

// Hook principal
export function usePlan(authUser, isAdmin = false) {
  const adminUser = Boolean(isAdmin)
  const [plan, setPlanState] = useState(adminUser ? 'admin' : null)
  const [nutritionPurchased, setNutritionPurchasedState] = useState(false)
  const [planReady, setPlanReady] = useState(!authUser || adminUser)

  useEffect(() => {
    if (adminUser) {
      setPlanState('admin')
      setNutritionPurchasedState(true)
      setPlanReady(true)
      return
    }

    if (!authUser) {
      setPlanState(null)
      setNutritionPurchasedState(false)
      setPlanReady(true)
      return
    }

    setPlanReady(false)

    const pending = getPendingPlan()
    const saved = getUserPlan(authUser.uid)

    if (pending) {
      setUserPlan(authUser.uid, pending)
      clearPendingPlan()
      setPlanState(pending)
    } else if (saved) {
      setPlanState(saved)
    } else {
      setPlanState(null)
    }

    setNutritionPurchasedState(getNutritionPurchased(authUser.uid))
    setPlanReady(true)
  }, [authUser, adminUser])

  const changePlan = (planId) => {
    if (adminUser) return
    if (authUser) {
      setUserPlan(authUser.uid, planId)
    } else {
      setPendingPlan(planId)
    }
    setPlanState(planId)
  }

  const unlockNutrition = () => {
    if (adminUser) {
      setNutritionPurchasedState(true)
      return
    }
    if (authUser) {
      setNutritionPurchased(authUser.uid, true)
      setNutritionPurchasedState(true)
    }
  }

  const perms = adminUser ? ADMIN_PERMS : (plan && PLAN_PERMS[plan] ? PLAN_PERMS[plan] : null)
  const hasNutrition = Boolean(adminUser || perms?.nutrition || nutritionPurchased)

  return { plan, perms, changePlan, nutritionPurchased, hasNutrition, unlockNutrition, planReady }
}

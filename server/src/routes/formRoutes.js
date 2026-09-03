import {Router} from 'express'
import {
  createFormFromPrompt,
  getDashboard,
  getFormById,
  getPublicForm,
  listForms,
  submitResponse,
  updateForm
} from '../controllers/formController.js'
import {requireAuth} from '../middleware/authMiddleware.js'

const router = Router()

router.get('/forms', requireAuth, listForms)
router.post('/forms/generate', requireAuth, createFormFromPrompt)
router.get('/forms/:id', requireAuth, getFormById)
router.put('/forms/:id', requireAuth, updateForm)
router.get('/forms/:id/dashboard', requireAuth, getDashboard)
router.get('/public/forms/:slug', getPublicForm)
router.post('/public/forms/:slug/responses', submitResponse)

export default router
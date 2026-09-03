// Import the Form model.
// This allows us to create, find, update, and work with forms in MongoDB.
import {Form} from '../models/Form.js'

// Import the Response model.
// This is used when someone submits answers to a form.
import {Response} from '../models/Response.js'

// Import the AI function.
// This function is used to generate a form structure from a user's prompt
// when the simpler/local methods cannot generate the form.
import {generateFormSchema} from '../services/aiService.js'

// Import utility/helper functions.
// buildSchemaFromFieldListInput → tries to build a form directly from the input.
// buildSchemaFromPrompt → tries to understand the prompt and build a form.
// toSlugBase → converts a title into a URL-friendly slug.
import {
  buildSchemaFromFieldListInput,
  buildSchemaFromPrompt,
  toSlugBase
} from '../utils/formTemplates.js'


// ---------------------------------------------------------
// 1. CHECK WHETHER THE LOGGED-IN USER OWNS THE FORM
// ---------------------------------------------------------

// This function receives:
// form   → the form we are checking
// userId → ID of the currently logged-in user
//
// It compares the form's owner with the logged-in user's ID.
//
// Example:
// form.owner = "123"
// userId     = "123"
// Result → true
//
// If:
// form.owner = "123"
// userId     = "456"
// Result → false
const isOwner = (form, userId) =>
  String(form.owner) === String(userId)


// ---------------------------------------------------------
// 2. CREATE A UNIQUE SLUG FOR THE FORM
// ---------------------------------------------------------

// This function creates a unique URL-friendly slug from the form title.
//
// Example:
// title = "Customer Feedback Form"
//
// First slug:
// customer-feedback-form
//
// If that already exists:
// customer-feedback-form-1
//
// If that also exists:
// customer-feedback-form-2
//
// And so on...
const buildUniqueSlug = async (title) => {

  // Convert the title into a URL-friendly base.
  //
  // Example:
  // "Customer Feedback Form"
  //       ↓
  // "customer-feedback-form"
  //
  // If toSlugBase(title) gives an empty value,
  // use "ai-form" as the default.
  const base = toSlugBase(title) || 'ai-form'

  // Initially, the slug is just the base.
  //
  // Example:
  // slug = "customer-feedback-form"
  let slug = base

  // Counter used when the slug already exists.
  let count = 1


  // Keep checking MongoDB while the current slug already exists.
  //
  // Form.exists({slug}) asks:
  //
  // "Does a form already have this slug?"
  while (await Form.exists({slug})) {

    // If the original slug already exists,
    // add the counter to make a new slug.
    //
    // Example:
    // customer-feedback-form
    //        ↓
    // customer-feedback-form-1
    slug = `${base}-${count}`

    // Increase the counter for the next attempt.
    //
    // 1 → 2 → 3 → ...
    count += 1
  }


  // Return the first slug that does not already exist.
  return slug
}


// =========================================================
// 3. CREATE FORM FROM USER'S PROMPT
// =========================================================

// This controller handles:
//
// Frontend
//    ↓
// User enters prompt
//    ↓
// Backend receives prompt
//    ↓
// Generate form
//    ↓
// Save form in MongoDB
//    ↓
// Send form back to frontend
export const createFormFromPrompt = async (req, res) => {


  // Get the "prompt" value from the request body.
  //
  // Example frontend request:
  //
  // {
  //   "prompt": "Create a customer feedback form"
  // }
  //
  // After this:
  //
  // prompt =
  // "Create a customer feedback form"
  const {prompt} = req.body


  // Check whether the prompt exists and is not empty.
  //
  // trim() removes spaces.
  //
  // Example:
  // "     " → ""
  //
  // If there is no useful prompt, stop the function
  // and send a 400 Bad Request response.
  if (!prompt?.trim()) {

    return res.status(400).json({
      message: 'Prompt is required'
    })
  }


  // Check whether DEBUG_AI is enabled in the .env file.
  //
  // If:
  //
  // DEBUG_AI=true
  //
  // then the prompt will be printed in the backend console.
  //
  // This is only for debugging/development.
  if (process.env.DEBUG_AI === 'true') {

    console.log(
      '[createFormFromPrompt] prompt:',
      prompt.trim()
    )
  }


  // Remove unnecessary spaces from the beginning and end.
  //
  // Example:
  //
  // "   Create feedback form   "
  //
  // becomes:
  //
  // "Create feedback form"
  const trimmedPrompt = prompt.trim()


  // -------------------------------------------------------
  // TRY METHOD 1: FIELD LIST INPUT
  // -------------------------------------------------------

  // Try to directly build a form from the user's input.
  //
  // Example input might be something that follows
  // a specific field-list format.
  //
  // If successful:
  //
  // direct = generated form schema
  //
  // If unsuccessful:
  //
  // direct = null / false / undefined
  const direct = buildSchemaFromFieldListInput(trimmedPrompt)


  // -------------------------------------------------------
  // TRY METHOD 2: PROMPT PARSER
  // -------------------------------------------------------

  // If direct generation failed,
  // try building the form from the prompt.
  //
  // The "||" means:
  //
  // If direct exists → use direct
  //
  // Otherwise → call buildSchemaFromPrompt()
  const derived =
    direct || buildSchemaFromPrompt(trimmedPrompt)


  // -------------------------------------------------------
  // TRY METHOD 3: AI
  // -------------------------------------------------------

  // Now decide which generated form to use.
  //
  // There are three possibilities.
  const generated =
    direct

      // CASE 1:
      // Direct method successfully generated a form.
      //
      // Add metadata saying:
      // "This form came from field-list processing."
      ? {
          ...direct,
          meta: {
            provider: 'field-list'
          }
        }

      // CASE 2:
      // Direct method failed,
      // but prompt parser successfully generated a form
      // with at least 2 questions.
      //
      // Add metadata saying:
      // "This form came from the prompt parser."
      : derived && derived.questions.length >= 2
        ? {
            ...derived,
            meta: {
              provider: 'prompt-parser'
            }
          }

        // CASE 3:
        // Neither local method produced a suitable form.
        //
        // So call the AI service.
        //
        // Example:
        //
        // "Create a job application form"
        //
        // goes to generateFormSchema().
        : await generateFormSchema(trimmedPrompt)


  // -------------------------------------------------------
  // DEBUG GENERATED FORM
  // -------------------------------------------------------

  // If DEBUG_AI=true,
  // print information about how the form was generated.
  if (process.env.DEBUG_AI === 'true') {

    console.log(
      '[createFormFromPrompt] provider:',
      generated?.meta?.provider,

      // If there is a reason, print it.
      // Otherwise print "n/a".
      'reason:',
      generated?.meta?.reason || 'n/a'
    )


    // Print information about every generated question.
    //
    // Instead of printing the entire question object,
    // only print:
    //
    // id
    // title
    // type
    // required
    console.log(
      '[createFormFromPrompt] questions:',

      (generated?.questions || []).map((q) => ({
        id: q.id,
        title: q.title,
        type: q.type,
        required: q.required
      }))
    )
  }


  // -------------------------------------------------------
  // CREATE UNIQUE SLUG
  // -------------------------------------------------------

  // Take the generated form's title
  // and create a unique URL slug.
  //
  // Example:
  //
  // generated.title
  // "Customer Feedback"
  //
  // slug
  // "customer-feedback"
  const slug = await buildUniqueSlug(generated.title)


  // -------------------------------------------------------
  // SAVE THE FORM IN MONGODB
  // -------------------------------------------------------

  // Create a new Form document in MongoDB.
  //
  // Form.create() uses the Form model/schema
  // that we imported at the top.
  const form = await Form.create({

    // Store the ID of the currently logged-in user.
    //
    // req.user was added by requireAuth middleware.
    //
    // Example:
    //
    // req.user._id = "123"
    //
    // So this form belongs to user "123".
    owner: req.user._id,


    // Store the generated form title.
    title: generated.title,


    // Store the generated description.
    description: generated.description,


    // Store the original prompt.
    //
    // Example:
    //
    // "Create a customer feedback form"
    prompt: trimmedPrompt,


    // Store the unique slug.
    slug,


    // Store all generated questions.
    questions: generated.questions,


    // Newly generated forms start as drafts.
    //
    // They are NOT public yet.
    status: 'draft'
  })


  // -------------------------------------------------------
  // DEBUG SAVED FORM
  // -------------------------------------------------------

  // If debugging is enabled,
  // print the questions that were actually saved in MongoDB.
  if (process.env.DEBUG_AI === 'true') {

    console.log(
      '[createFormFromPrompt] saved form questions:',

      form.questions.map((q) => ({
        id: q.id,
        title: q.title,
        type: q.type
      }))
    )
  }


  // -------------------------------------------------------
  // SEND RESPONSE TO FRONTEND
  // -------------------------------------------------------

  // Send HTTP 201 Created response.
  //
  // The frontend receives:
  //
  // {
  //   form: {...},
  //   meta: {...}
  // }
  return res.status(201).json({
    form,

    // Send information about how the form was generated.
    meta: generated.meta
  })
}


// =========================================================
// 4. LIST ALL FORMS BELONGING TO CURRENT USER
// =========================================================

export const listForms = async (req, res) => {

  // Find all forms whose owner is the currently
  // logged-in user's ID.
  //
  // req.user was created by authentication middleware.
  //
  // Example:
  //
  // req.user._id = "123"
  //
  // MongoDB searches:
  //
  // { owner: "123" }
  const forms = await Form.find({
    owner: req.user._id
  })


    // Sort by createdAt in descending order.
    //
    // -1 means newest first.
    //
    // So:
    //
    // Form C → newest
    // Form B
    // Form A → oldest
    .sort({
      createdAt: -1
    })


  // Send all the user's forms to the frontend.
  res.json(forms)
}


// =========================================================
// 5. GET ONE FORM BY ID
// =========================================================

export const getFormById = async (req, res) => {

  // Get the form ID from the URL.
  //
  // Example:
  //
  // GET /forms/123
  //
  // req.params.id = "123"
  //
  // Then search MongoDB for that ID.
  const form = await Form.findById(req.params.id)


  // If no form was found,
  // send 404 Not Found.
  if (!form) {

    return res.status(404).json({
      message: 'Form not found'
    })
  }


  // Check whether the logged-in user owns this form.
  //
  // This prevents User A from accessing User B's form.
  if (!isOwner(form, req.user._id)) {

    return res.status(403).json({
      message: 'You do not have access to this form'
    })
  }


  // If the form exists AND the logged-in user owns it,
  // send the form to the frontend.
  return res.json(form)
}


// =========================================================
// 6. UPDATE FORM
// =========================================================

export const updateForm = async (req, res) => {

  // Get the data sent by the frontend.
  //
  // Example:
  //
  // {
  //   "title": "Updated Feedback Form",
  //   "status": "published"
  // }
  const payload = req.body


  // Find the form using the ID from the URL.
  const form = await Form.findById(req.params.id)


  // If the form doesn't exist,
  // return 404.
  if (!form) {

    return res.status(404).json({
      message: 'Form not found'
    })
  }


  // Make sure the current user owns the form.
  if (!isOwner(form, req.user._id)) {

    return res.status(403).json({
      message: 'You do not have access to this form'
    })
  }


  // Check whether the title is actually changing.
  //
  // Boolean(...) converts the result into true/false.
  //
  // Example:
  //
  // old title = "Feedback"
  // new title = "Customer Feedback"
  //
  // titleChanged = true
  const titleChanged = Boolean(
    payload.title &&
    payload.title !== form.title
  )


  // If a new title was provided,
  // use it.
  //
  // Otherwise keep the old title.
  //
  // ?? means:
  // use the left side if it isn't null/undefined,
  // otherwise use the right side.
  form.title = payload.title ?? form.title


  // Update description if provided.
  // Otherwise keep the existing description.
  form.description =
    payload.description ?? form.description


  // Update questions if provided.
  // Otherwise keep existing questions.
  form.questions =
    payload.questions ?? form.questions


  // Update status if provided.
  // Otherwise keep existing status.
  form.status =
    payload.status ?? form.status


  // Update theme if provided.
  // Otherwise keep existing theme.
  form.theme =
    payload.theme ?? form.theme


  // If the title changed,
  // generate a new unique slug.
  if (titleChanged) {

    form.slug =
      await buildUniqueSlug(payload.title)
  }


  // Save all changes to MongoDB.
  await form.save()


  // Send the updated form back to frontend.
  return res.json(form)
}


// =========================================================
// 7. GET PUBLIC FORM
// =========================================================

export const getPublicForm = async (req, res) => {

  // Find a form using its slug.
  //
  // BUT only find it if:
  //
  // 1. slug matches
  // 2. status is "published"
  //
  // This prevents draft forms from being publicly accessible.
  const form = await Form.findOne({
    slug: req.params.slug,
    status: 'published'
  })


    // Do not return the original prompt.
    //
    // "-prompt" means:
    //
    // "Exclude the prompt field."
    //
    // The prompt is internal creator information.
    .select('-prompt')


  // If there is no published form with this slug,
  // return 404.
  if (!form) {

    return res.status(404).json({
      message: 'Published form not found'
    })
  }


  // Send the public form to the frontend/respondent.
  return res.json(form)
}


// =========================================================
// 8. SUBMIT RESPONSE TO A FORM
// =========================================================

export const submitResponse = async (req, res) => {

  // Find the form using its public slug.
  //
  // Only allow submissions to published forms.
  const form = await Form.findOne({
    slug: req.params.slug,
    status: 'published'
  })


  // If the form doesn't exist
  // or isn't published,
  // return 404.
  if (!form) {

    return res.status(404).json({
      message: 'Published form not found'
    })
  }


  // Get answers from the request body.
  //
  // Expected format:
  //
  // {
  //   "answers": [
  //     {
  //       "questionId": "q1",
  //       "value": "Anugraha"
  //     }
  //   ]
  // }
  //
  // Array.isArray() checks whether answers is actually an array.
  //
  // If it isn't an array,
  // use an empty array instead.
  const answers =
    Array.isArray(req.body.answers)
      ? req.body.answers
      : []


  // Find all questions that are required.
  //
  // filter() keeps only questions where:
  //
  // question.required === true
  //
  // Then map() extracts only their IDs.
  //
  // Example:
  //
  // q1 → required
  // q2 → optional
  // q3 → required
  //
  // Result:
  //
  // ["q1", "q3"]
  const requiredQuestionIds =
    form.questions
      .filter((question) => question.required)
      .map((question) => question.id)


  // Extract the question IDs that the user actually answered.
  //
  // Example:
  //
  // answers:
  //
  // q1 → "Anugraha"
  // q2 → "23"
  //
  // submittedQuestionIds:
  //
  // q1, q2
  //
  // Set is useful because it allows us to easily check:
  //
  // "Does this question ID exist?"
  const submittedQuestionIds =
    new Set(
      answers.map((answer) => answer.questionId)
    )


  // Find required questions that were NOT answered.
  //
  // Example:
  //
  // Required:
  // q1
  // q3
  //
  // Submitted:
  // q1
  // q2
  //
  // Missing:
  // q3
  const missing =
    requiredQuestionIds.filter(
      (questionId) =>
        !submittedQuestionIds.has(questionId)
    )


  // If at least one required question is missing,
  // don't save the response.
  if (missing.length > 0) {

    return res.status(400).json({
      message: 'Missing required answers',

      // Tell the frontend which questions are missing.
      missing
    })
  }


  // All required questions have been answered.
  //
  // Create a Response document in MongoDB.
  const response = await Response.create({

    // Store which form this response belongs to.
    //
    // Example:
    //
    // form._id = "form123"
    form: form._id,

    // Store the submitted answers.
    answers
  })


  // Send the newly created response back to frontend.
  return res.status(201).json(response)
}


// =========================================================
// 9. GET FORM DASHBOARD
// =========================================================

export const getDashboard = async (req, res) => {

  // Find the form using the ID from the URL.
  const form = await Form.findById(req.params.id)


  // If the form doesn't exist,
  // return 404.
  if (!form) {

    return res.status(404).json({
      message: 'Form not found'
    })
  }


  // Make sure the currently logged-in user owns the form.
  //
  // Only the creator should be able to see
  // the form's responses/dashboard.
  if (!isOwner(form, req.user._id)) {

    return res.status(403).json({
      message: 'You do not have access to this form'
    })
  }


  // Find all responses belonging to this form.
  //
  // Sort them by createdAt in descending order.
  //
  // -1 = newest first.
  const responses =
    await Response.find({
      form: form._id
    }).sort({
      createdAt: -1
    })


  // Take only the first 10 responses.
  //
  // Since responses are already sorted newest-first,
  // these are the latest 10 responses.
  const latestResponses =
    responses.slice(0, 10)


  // Send dashboard information to frontend.
  res.json({

    // Send the complete form.
    form,


    // Send summary information.
    summary: {

      // Total number of responses.
      //
      // Example:
      // responses.length = 25
      //
      // totalResponses = 25
      totalResponses: responses.length,


      // Check whether the form is published.
      //
      // If:
      // form.status = "published"
      //
      // result = true
      //
      // Otherwise:
      // result = false
      published:
        form.status === 'published',


      // Count how many questions the form has.
      //
      // Example:
      // form.questions.length = 8
      //
      // questionCount = 8
      questionCount:
        form.questions.length
    },


    // Send only the latest 10 responses.
    latestResponses
  })
}
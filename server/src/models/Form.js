import mongoose from 'mongoose'

// optionSchema  (_id: false) → label (String, required), value (String, required)
const optionSchema = new mongoose.Schema(
  {
    label: {type: String, required: true},
    value: {type: String, required: true}
  },
  {_id: false}
)

// questionSchema (_id: false) → id, title (required), description (default: ''),
//   type (enum: short_text | long_text | email | number | select | radio | checkbox | date, required),
//   required (Boolean, default: false), placeholder (default: ''),
//   options ([optionSchema], default: []),
//   validation: { minLength, maxLength, min, max, pattern }
const questionSchema = new mongoose.Schema(
  {
    id: {type: String, required: true},
    title: {type: String, required: true},
    description: {type: String, default: ''},
    type: {
      type: String,
      enum: ['short_text', 'long_text', 'email', 'number', 'select', 'radio', 'checkbox', 'date'],
      required: true
    },
    required: {type: Boolean, default: false},
    placeholder: {type: String, default: ''},
    options: {type: [optionSchema], default: []},
    validation: {
      minLength: {type: Number},
      maxLength: {type: Number},
      min: {type: Number},
      max: {type: Number},
      pattern: {type: String}
    }
  },
  {_id: false}
)

// formSchema (timestamps: true) →
//   owner (ObjectId, ref: 'User', required),
//   title (required), description (default: ''),
//   prompt (required), slug (required, unique),
//   status (enum: draft | published, default: 'draft'),
//   theme: { accent (default: '#ff6b35'), surface (default: '#fff8ef') },
//   questions ([questionSchema], default: [])
const formSchema = new mongoose.Schema(
  {
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    title: {type: String, required: true},
    description: {type: String, default: ''},
    prompt: {type: String, required: true},
    slug: {type: String, required: true, unique: true},
    status: {type: String, enum: ['draft', 'published'], default: 'draft'},
    theme: {
      accent: {type: String, default: '#ff6b35'},
      surface: {type: String, default: '#fff8ef'}
    },
    questions: {type: [questionSchema], default: []}
  },
  {timestamps: true}
)

export const Form = mongoose.model('Form', formSchema)
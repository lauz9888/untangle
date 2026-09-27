import { beforeAll } from 'vitest'
import { setProjectAnnotations } from '@storybook/vue3-vite'
import * as a11yAnnotations from '@storybook/addon-a11y/preview'
import * as projectAnnotations from './preview'

const project = setProjectAnnotations([a11yAnnotations, projectAnnotations])

beforeAll(project.beforeAll)

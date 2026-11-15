import { apply as applyHost } from '../host/index.js'
import { registerMobile } from './mobile.js'

export const name = 'local-craft-anything'
export const inject = ['tools']

export function apply(ctx, config = {}) {
  applyHost(ctx, config)
  registerMobile(ctx, config)
}

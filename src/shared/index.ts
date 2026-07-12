/**
 * Public entry point for the shared library.
 *
 * This directory is intended to become an independent Git submodule /
 * standalone package. Keep it self-contained: only depend on
 * framework-agnostic tooling (class-validator, class-transformer) plus the
 * Swagger decorators used for OpenAPI documentation. Feature modules must
 * import their DTOs and models from here — never redefine them locally.
 */
export * from './dto';
export * from './models';

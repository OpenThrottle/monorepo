# OpenThrottle — development environment.
#
# STATUS: NOT DEPLOYED. This environment is an intentional placeholder — no
# resources are instantiated here yet. The reusable OpenThrottle composition
# lives in ../../applications/openthrottle but is not wired into any live
# environment (see ../staging/openthrottle.tf, which is commented out by design).
#
# Do not assume infra is deployed from this directory. To stand up development,
# add a `module "openthrottle"` block (mirroring the commented staging example)
# with development-appropriate domains, network, and credentials, then plan/apply.

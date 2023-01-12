FROM gitpod/workspace-full

USER root

RUN curl -fsSL https://get.pnpm.io/install.sh | sh -

RUN pnpm env use -g 18


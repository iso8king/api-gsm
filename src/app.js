import { logger } from "./application/logging.js";
import { web } from "./application/web.js";

const port = 7038;
logger.info(`App loaded in ${port}`);
web.listen(port)

export default web;
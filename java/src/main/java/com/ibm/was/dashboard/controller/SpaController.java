package com.ibm.was.dashboard.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Forwards all non-API, non-asset requests to the React SPA index.html.
 * This enables client-side routing (React Router) to work on hard refresh.
 */
@Controller
public class SpaController {

    /** Match anything that does NOT look like a file (no dot in last segment). */
    @RequestMapping(value = {"/{path:^(?!api|actuator|health)[^\\.]*}",
                              "/{path:^(?!api|actuator|health)[^\\.]*}/**"})
    public String forward() {
        return "forward:/index.html";
    }
}

import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import "./index.css"

const rootEl = document.getElementById("root")
if (!rootEl) {
  document.body.innerHTML = '<h1 style="color:white;text-align:center;padding-top:100px">#root not found</h1>'
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      React.createElement(React.StrictMode, null, React.createElement(App))
    )
  } catch(e) {
    rootEl.innerHTML = '<h1 style="color:red;text-align:center;padding-top:100px">Error: ' + e.message + '</h1>'
  }
}
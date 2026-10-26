# R spam-filter API for Render (Docker runtime)
FROM rstudio/plumber:latest

WORKDIR /app
COPY plumber.R run.R model.json ./

ENV PORT=8000
EXPOSE 8000
ENTRYPOINT ["Rscript", "run.R"]

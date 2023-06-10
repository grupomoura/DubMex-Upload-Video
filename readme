Aqui está a documentação para a API:

# Documentação da API

## Autenticação

Todas as rotas da API requerem autenticação por meio de uma chave de API. A chave de API deve ser enviada no cabeçalho da solicitação com a chave `api-key`.

Exemplo de cabeçalho da solicitação:

```
api-key: SUA_CHAVE_DE_API
```

### Erros de autenticação

Se a chave de API estiver ausente ou inválida, você receberá uma resposta de erro com o status 401 (Acesso não autorizado).

## Rotas

### Baixar áudio de um vídeo do YouTube

```
GET /download/audio?url={URL_DO_VÍDEO}
```

Esta rota permite baixar o áudio de um vídeo do YouTube especificado pela URL. O áudio será salvo como um arquivo MP3.

Parâmetros de consulta:

- `url`: A URL do vídeo do YouTube.

#### Exemplo de solicitação

```
GET /download/audio?url=https://www.youtube.com/watch?v=VIDEO_ID
api-key: SUA_CHAVE_DE_API
```

#### Resposta de sucesso

Status: 200 OK

```json
{
  "message": "Áudio baixado com sucesso!",
  "downloadUrl": "https://seuhost.com/download/audio/VIDEO_ID.mp3"
}
```

#### Resposta de erro

Status: 400 Bad Request

```json
{
  "error": "Não foi possível encontrar um formato de áudio com 128kbps."
}
```

Status: 500 Internal Server Error

```json
{
  "error": "Ocorreu um erro ao baixar o áudio."
}
```

### Baixar áudios de uma lista de vídeos do YouTube

```
GET /download/audio-list?urls={URLS_DOS_VÍDEOS}
```

Esta rota permite baixar os áudios de uma lista de vídeos do YouTube especificados pelas URLs. Os áudios serão salvos como arquivos MP3.

Parâmetros de consulta:

- `urls`: As URLs dos vídeos do YouTube, separadas por vírgula.

#### Exemplo de solicitação

```
GET /download/audio-list?urls=https://www.youtube.com/watch?v=VIDEO_ID_1,https://www.youtube.com/watch?v=VIDEO_ID_2
api-key: SUA_CHAVE_DE_API
```

#### Resposta de sucesso

Status: 200 OK

```json
{
  "message": "Áudios baixados com sucesso!",
  "downloadUrls": [
    "https://seuhost.com/download/audio-list/VIDEO_ID_1.mp3",
    "https://seuhost.com/download/audio-list/VIDEO_ID_2.mp3"
  ]
}
```

#### Resposta de erro

Status: 400 Bad Request

```json
{
  "error": "Nenhum link de vídeo fornecido."
}
```

Status: 500 Internal Server Error

```json
{
  "error": "Ocorreu um erro ao baixar o áudio para o vídeo: URL_DO_VÍDEO"
}
```

### Baixar áudios de uma playlist do YouTube

```
GET /download/playlist?url={URL_DA_PLAYLIST}
```

Esta rota permite baixar os áudios de uma playlist do YouTube especificada pela URL. Os áudios serão salvos como arquivos MP3, organizados em uma pasta com o nome do canal.

Parâmetros de consulta:

- `url`: A URL da
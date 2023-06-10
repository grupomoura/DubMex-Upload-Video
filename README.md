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

## API de Download de Áudio

Esta é uma API para baixar áudio do YouTube. Ela oferece várias rotas para baixar áudio de vídeos individuais, baixar uma lista de áudios de vídeos e baixar áudios de playlists ou canais específicos.

### Endpoints

#### Baixar Áudio de um Vídeo

```
GET /download/audio
```

Este endpoint permite baixar o áudio de um vídeo do YouTube.

**Parâmetros de consulta:**

- `url` (obrigatório): URL do vídeo do YouTube.

**Exemplo de solicitação:**

```
GET /download/audio?url=https://youtube.com/watch?v=abcd1234
```

**Resposta de exemplo:**

```json
{
  "message": "Áudio baixado com sucesso!",
  "downloadUrl": "https://example.com/download/audio/abcd1234.mp3"
}
```

#### Baixar Lista de Áudios de Vídeos

```
GET /download/audio-list
```

Este endpoint permite baixar uma lista de áudios de vídeos do YouTube.

**Parâmetros de consulta:**

- `urls` (obrigatório): URLs dos vídeos do YouTube, separados por vírgulas.

**Exemplo de solicitação:**

```
GET /download/audio-list?urls=https://youtube.com/watch?v=abcd1234,https://youtube.com/watch?v=efgh5678
```

**Resposta de exemplo:**

```json
{
  "message": "Áudios baixados com sucesso!",
  "downloadUrls": [
    "https://example.com/download/audio/abcd1234.mp3",
    "https://example.com/download/audio/efgh5678.mp3"
  ]
}
```

#### Baixar Áudios de uma Playlist

```
GET /download/playlist-audio
```

Este endpoint permite baixar áudios de uma playlist do YouTube.

**Parâmetros de consulta:**

- `url` (obrigatório): URL da playlist do YouTube.

**Exemplo de solicitação:**

```
GET /download/playlist-audio?url=https://youtube.com/playlist?list=abcd1234
```

**Resposta de exemplo:**

```json
{
  "message": "Áudios da playlist baixados com sucesso!",
  "channelDir": "./downloads/playlist-audio/ChannelName",
  "links": [
    "https://example.com/download/playlist-audio/ChannelName/audio1.mp3",
    "https://example.com/download/playlist-audio/ChannelName/audio2.mp3"
  ]
}
```

#### Baixar Áudios de um Canal

```
GET /download/channel-audio
```

Este endpoint permite baixar áudios de um canal do YouTube.

**Parâmetros de consulta:**

- `url` (obrigatório): URL do canal do YouTube.

**Exemplo de solicitação:**

```
GET /download/channel-audio?url=https://youtube.com/channel/abcd1234
```

**Resposta de exemplo:**

```json
{
  "message": "Áudios do canal baixados com sucesso!",
  "channelDir": "./downloads/channel-audio/ChannelName",
    "links": [
      "http://localhost:3000/download/channel/James/7vvGJgLArIM.mp3",
      "http://localhost:3000/download/channel/James/J0CJzGGsbG8.mp3"
  ]
}

## API de Download de Vídeos

Esta é uma API para baixar vídeos do YouTube. Ela oferece várias rotas para pesquisar vídeos, obter informações sobre resoluções disponíveis, baixar vídeos individuais, baixar uma lista de vídeos e baixar vídeos de uma playlist ou canal específico.

### Requisições Autenticadas

Todas as rotas da API requerem autenticação. Certifique-se de incluir um cabeçalho de autenticação válido em suas solicitações.

### Endpoints

#### Pesquisar Vídeos

```
GET /search-videos
```

Este endpoint permite pesquisar vídeos no YouTube com base em uma consulta fornecida.

**Parâmetros de consulta:**

- `q` (obrigatório): A consulta de pesquisa.

**Exemplo de solicitação:**

```
GET /search-videos?q=gatos
```

**Resposta de exemplo:**

```json
[
  {
    "title": "Vídeo de gatos engraçados",
    "videoId": "abcd1234",
    "url": "https://youtube.com/watch?v=abcd1234"
  },
  {
    "title": "Compilação de gatos fofinhos",
    "videoId": "efgh5678",
    "url": "https://youtube.com/watch?v=efgh5678"
  }
]
```

#### Obter Resoluções de Vídeo

```
GET /video/resolutions
```

Este endpoint retorna uma lista de resoluções disponíveis para um vídeo do YouTube.

**Parâmetros de consulta:**

- `url` (obrigatório): URL do vídeo do YouTube.

**Exemplo de solicitação:**

```
GET /video/resolutions?url=https://youtube.com/watch?v=abcd1234
```

**Resposta de exemplo:**

```json
[
  {
    "itag": "22",
    "resolution": "720p",
    "extension": "mp4"
  },
  {
    "itag": "18",
    "resolution": "360p",
    "extension": "mp4"
  }
]
```

#### Baixar Vídeo

```
GET /download/video
```

Este endpoint permite baixar um vídeo do YouTube em uma resolução específica.

**Parâmetros de consulta:**

- `url` (obrigatório): URL do vídeo do YouTube.
- `resolution` (opcional): A resolução desejada do vídeo. O padrão é "720p".

**Exemplo de solicitação:**

```
GET /download/video?url=https://youtube.com/watch?v=abcd1234&resolution=720p
```

**Resposta de exemplo:**

```json
{
  "message": "Vídeo baixado com sucesso!",
  "downloadUrl": "https://example.com/download/video/abcd1234.mp4"
}
```

#### Baixar Lista de Vídeos

```
GET /download/video-list
```

Este endpoint permite baixar uma lista de vídeos do YouTube em uma resolução específica.

**Parâmetros de consulta:**

- `urls` (obrigatório): URLs dos vídeos do YouTube, separados por vírgulas.
- `resolution` (opcional): A resolução desejada dos vídeos. O padrão é "720p".

**Exemplo de solicitação:**

```
GET /download/video-list?urls=https

://youtube.com/watch?v=abcd1234,https://youtube.com/watch?v=efgh5678&resolution=720p
```

**Resposta de exemplo:**

```json
{
  "message": "Vídeos baixados com sucesso!",
  "downloadUrls": [
    "https://example.com/download/video/abcd1234.mp4",
    "https://example.com/download/video/efgh5678.mp4"
  ]
}
```

